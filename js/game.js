// Crown of Tides — story, rooms and puzzle logic. Pure data + functions, no DOM,
// so the walkthrough test can run it in Node.
//
// A result from act()/choose()/travel() can carry:
//   say:   lines; each a string (narrator) or [speaker, text]
//   go:    {to, x, y}  move rooms
//   die:   text        death screen
//   choose:{id, prompt, options:[[optId, text]]}  ask the player
//   map:   true        open the sea chart
//   win:   'short' | 'long'
(function (root) {
  'use strict';

  const MAX_SCORE = 231;

  const ITEMS = {
    ring: { name: 'Signet ring', desc: 'Your signet ring, carved with the leaping stag of Thornmere. Proof of who you are, to anyone willing to look.' },
    bottle: { name: 'Corked bottle', desc: 'A green bottle with a rolled-up note inside. The cork is jammed in tight. Somebody really wanted this message to arrive.' },
    conch: { name: 'Conch shell', desc: 'A big spiral conch. Hold it to your ear and you hear the sea... and, very faintly, something that sounds like a voice.' },
    token: { name: 'Ferry token', desc: 'A brass token stamped with a little sailboat.' },
    glowcap: { name: 'Glowcap', desc: 'A fat mushroom glowing a soft, steady green. Better than a lantern, and it smells faintly of mint.' },
    whistle: { name: 'Silver whistle', desc: 'A slender silver whistle. Three notes are etched along its side, rising like a wave.' },
    oilcan: { name: 'Oil can', desc: 'A brass oil can with a long spout. Pim has written "DO NOT DRINK" on it, which raises questions.' },
    emptylantern: { name: 'Empty lantern', desc: 'A brass lantern from Pim, empty and cold. It needs true fire from the Great Forge.' },
    bun: { name: 'Sweet bun', desc: 'One of Marla\'s sweet buns, sticky with honey. It smells like heaven. You are saving it, for reasons you can\'t quite explain.' },
    thread: { name: 'Spider silk', desc: 'A single strand of Madame Weft\'s silk, finer than hair and stronger than rope. It shines like silver.' },
    songsheet: { name: 'Song sheet', desc: 'Fennick\'s handwritten Lullaby of the Isles. "Sing it to anything with teeth," he said.' },
    keys: { name: 'Key ring', desc: 'A heavy ring of castle keys, lifted from a sleeping guard. One of them is black, with a silver bow.' },
    coin: { name: 'Old coin', desc: 'A worn gold coin stamped with a smuggler\'s skull. Lucky, maybe.' },
    tabard: { name: 'Servant\'s tabard', desc: 'A sea-green tabard with the castle crest. Wearing it, you look like every other servant in the castle. That\'s the point.' },
    prism: { name: 'Lamp prism', desc: 'A cracked glass prism from the lighthouse lamp. Hold it up to the sun and it throws a dazzling flash of rainbow light.' },
    rattler: { name: 'Clockwork rattler', desc: 'Pim\'s "DO NOT WIND" invention. Wind it and it makes the loudest, most horrible racket on any island. Pim says it was meant to be an alarm clock.' },
    stinkhorn: { name: 'Stinkhorn', desc: 'A Mistwood mushroom that smells like a fish that died of embarrassment inside an old boot. Your eyes water just holding it.' },
    pickle: { name: 'Fire pickle', desc: 'One of Marla\'s famous fire pickles, pickled in pepper, vinegar and something she won\'t name. Sailors dare each other to eat them. Most lose.' },
    kelp: { name: 'Cold kelp', desc: 'A slimy strip of kelp from the Sentinel rocks, cold as the deep sea and clammy to the touch.' },
    seaglass: { name: 'Sea glass', desc: 'A smooth piece of green sea glass, frosted by the waves. It glows like a jewel when you hold it to the light.' },
    parchment: { name: 'Parchment', desc: 'A sheet of good parchment and a stick of charcoal, from Bram. Enough for one short letter.' },
    reply: { name: 'Elowen\'s letter', desc: 'In a quick, slanted hand: "Rowan. Pip found me. I\'m watched every hour. Varrick tells everyone Father is dying, but at night I hear him boast that Father merely SLEEPS, in the tower. He keeps his secrets in his study, and the key never leaves the guard who sleeps in the cellar. He will not have a mirror in any room, not even for the wedding. Wear my ribbon. Bertha in the kitchen will know it, and so will I. Hurry. Sundown. E."' },
    ribbon: { name: 'Sea-green ribbon', desc: 'A ribbon of sea-green silk that smells faintly of roses. Elowen\'s.' },
    lantern: { name: 'Forge lantern', desc: 'A brass lantern holding a living ember from the Clockmakers\' forge. It never goes out and it never burns your fingers.' },
    fish: { name: 'Silver fish', desc: 'A plump silver fish, wrapped in paper. It smells exactly like a fish.' },
    compass: { name: 'Magic map', desc: 'Hester\'s magic map of the Tidewater Isles. The ink moves with the tides, and the little compass rose always points the way home. Touch an island on it, outdoors, and the map carries you there.' },
    feather: { name: 'Feather of Dawn', desc: 'A long golden feather from the roc of the Sentinel Isle. It glows like the first minute of morning. Old stories say dawn breaks any spell cast in the dark.' },
    mirror: { name: 'Mirror shell', desc: 'A shell polished to a perfect mirror by the mer-queen Nerissa. "What is cast at you," she said, "send home."' },
    letter: { name: "Varrick's letter", desc: 'A letter from Varrick\'s desk, in his own hand: "The old king sleeps in the tower and will not wake. The true will is ash. My copy names me regent and Elowen\'s husband. The scribe has been paid. Burn this." He did not burn it.' }
  };

  const ISLES = {
    crown: { name: 'Isle of the Crown', to: 'docks', x: 160, y: 172 },
    mists: { name: 'Isle of Mists', to: 'mistshore', x: 210, y: 176 },
    clocks: { name: 'Isle of Clocks', to: 'clockharbor', x: 226, y: 176 },
    sentinels: { name: 'Sentinel Isle', to: 'sentbase', x: 30, y: 182 },
    reef: { name: 'Coral Strand', to: 'reef', x: 226, y: 176 }
  };

  const newState = (rand = Math.random) => ({
    room: 'beach', x: 160, y: 172, inv: [], score: 0, won: false,
    flags: { liar: rand() < 0.5 ? 'granite' : 'basalt', safe: rand() < 0.5 ? 'left' : 'right' }
  });

  // ---- helpers ----
  const has = (s, i) => s.inv.includes(i);
  const gain = (s, i) => { if (!has(s, i)) s.inv.push(i); };
  const lose = (s, i) => { s.inv = s.inv.filter(x => x !== i); };
  const flag = (s, f) => !!s.flags[f];
  const set = (s, f) => { s.flags[f] = true; };
  // Award points once per key.
  const pts = (s, key, n) => { const k = 'pts_' + key; if (s.flags[k]) return; s.flags[k] = true; s.score += n; };
  const say = (...lines) => ({ say: lines });
  // The open sea: walk into it and the tide takes you, like the old games.
  const LAGOON_DEATH = 'You wade into the turquoise lagoon. Something large and toothy, which is not a Tide Warden, decides you are lunch.\n\nThe queen\'s lagoon keeps its own guards.';
  const sea = (rect, death) => ({
    id: 'sea', name: 'the sea', rect,
    look: () => say('Endless blue water, all the way to the horizon.'),
    hand: () => say('The water is cold, and very, very salty.'),
    talk: () => say('You call out across the waves. The sea does not answer. It rarely does.'),
    walk: () => ({ die: death || 'You wade into the surf for a refreshing swim. A riptide has other plans.\n\nIt carries you past the reef, past the horizon, and into the next chapter of somebody else\'s story.' })
  });
  const once = (s, f, lines) => flag(s, f) ? null : (set(s, f), lines);

  // Boats: before the chart the ferry only knows two routes; after it, the chart opens the map.
  const boatFrom = home => s => flag(s, 'compass') ? { map: true }
    : home === 'docks' ? (flag(s, 'paid') ? { choose: ferryChoice } : say(['nell', 'Oi! Token first!']))
      : { say: ['You climb back aboard and the ferry carries you to Saltmarrow.'], go: { to: 'docks', x: 180, y: 170 } };
  const ferryChoice = { id: 'ferry', prompt: '"Where to?" asks the ferrywoman.', options: [['mists', 'The Isle of Mists'], ['clocks', 'The Isle of Clocks'], ['stay', 'Nowhere yet']] };

  // ---- conversations: Talk opens a topic menu, and each answer loops back to it ----
  const TALKS = {};
  function openTalk(s, who, lead) {
    const T = TALKS[who], list = T.topics(s).filter(Boolean);
    const r = { choose: { id: 'talk_' + who, prompt: T.prompt, options: list.map(([k, l]) => [k, l]).concat([['bye', 'Goodbye']]) } };
    if (lead && lead.length) r.say = lead;
    return r;
  }
  const L = (who, ...lines) => lines.map(x => [who, x]);

  TALKS.bram = { prompt: 'Ask Old Bram about...', topics: s => [
    ['wares', 'What will you trade?', s => {
      const out = L('bram', 'Bram trades fair, lad. Bring me what the sea gives up and I\'ll find you something useful for it.');
      if (!flag(s, 'traded')) out.push(['bram', 'A message in a bottle buys a ferry token. Nothing like a stranger\'s secrets.']);
      if (!flag(s, 'traded_glass')) out.push(['bram', 'Parchment and charcoal, for a nice piece of sea glass. The tide pools past the Coral Strand are thick with it, so the mer-folk say. Somebody might want to write a letter one day.']);
      out.push(['bram', 'And bring me anything else you find. I\'ll tell you what it\'s worth, even if I don\'t want it. Especially then.']);
      return out;
    }],
    ['town', 'What\'s happening in town?', s => flag(s, 'lit')
      ? L('bram', 'Hester\'s light is burning again! The Steward\'s men came stamping down the docks about it. First smile I\'ve seen in Saltmarrow in weeks.')
      : L('bram', 'A wedding nobody wants, a king nobody\'s allowed to see, and a lighthouse that\'s been dark for six weeks. You\'re the fourth wreck since it went out. Hester\'s fit to spit.')],
    ['varrick', 'Tell me about the Steward.', () => L('bram', 'Varrick turned up three years ago with nothing but a black coat and a black pearl. A month after he was made Steward, the king took ill. Make of that what you will.', 'Never seen him without that pearl. Never seen him look in a mirror, either. Vain men usually can\'t stop.')],
    ['isles', 'Tell me about the isles.', () => L('bram', 'The Oracle lives on the Isle of Mists. She listens to shells. The Clockmakers have the only fire that never dies. Sentinel Isle\'s got two stone liars, well, one liar. And the mer-folk on the Coral Strand only come up for music.')],
    flag(s, 'got_reply') && ['elowen', 'Have you heard from the princess?', () => L('bram', 'The princess? She used to come in here as a girl and try on the mermaid\'s comb. Said one day a prince would come out of a mirror for her.', 'Huh. Look at you.')]
  ] };

  TALKS.marla = { prompt: 'Ask Marla about...', topics: s => [
    ['gossip', 'Any gossip?', () => L('marla', 'The princess used to slip down here in a cloak and pretend nobody knew her. Bertha, the castle cook, would come fetch her. Thick as thieves, those two.', 'If you ever need a friend inside the castle, it\'s Bertha.')],
    ['castle', 'What\'s the castle like inside?', () => L('marla', 'Servants\' hall runs from the cellar up to the gallery. Varrick keeps that great hound in it. My cousin\'s lad guards the cellar, and from what I hear he spends the whole night asleep with a mug of wedding wine.', 'He keeps the castle keys on his belt, too. Silly boy.')],
    ['king', 'What happened to the king?', () => L('marla', 'Took to his bed three weeks after Varrick took the Steward\'s chain. Nobody\'s seen him since. "Too ill for visitors." I\'ve seen ill. That\'s not ill, that\'s hidden.')],
    ['fennick', 'What\'s wrong with the bard?', s => flag(s, 'strung') ? L('marla', 'He\'s playing again, bless him. Put the cat to sleep for a whole day.') : L('marla', 'Broke his best string and won\'t shut up about it. Says only spider silk will do. Spiders! In the Mistwood! He\'d sooner eat his lute.')]
  ] };

  TALKS.fennick = { prompt: 'Ask Fennick about...', topics: s => [
    ['string', flag(s, 'strung') ? 'That lullaby...' : 'Your broken string?', s => flag(s, 'strung')
      ? L('fennick', 'The Lullaby of the Isles works on anything with teeth. Sea-serpents, wolves, tax collectors. Sing it soft, sing it all the way through.')
      : L('fennick', 'Only spider silk is fine enough, and only Madame Weft in the Mistwood spins it. They say she bargains rather than bites, if you bring her what she wants. I hear she hates the dark.')],
    ['legends', 'Know any old legends?', () => L('fennick', 'The Ballad of the Singing Cliffs! Smugglers carved a door in the rock that only opens to a three-note tune. The tune was lost, but the Oracle hears everything the sea remembers.', 'Second verse is about a mermaid queen who only rises for music. Third verse is about my lute, but I wrote that one.')],
    ['wedding', 'What do you think of the wedding?', () => L('fennick', 'I was hired to play it. I\'d rather play a funeral for the groom. Don\'t tell anyone I said that. Actually, do.')]
  ] };

  TALKS.nell = { prompt: 'Ask the ferrywoman about...', topics: s => [
    ['isles', 'Where can you take me?', () => flag(s, 'paid') ? L('nell', 'Mists and Clocks. That\'s my route. The far isles, Sentinel and the Coral Strand, need a proper map, and the only one worth a spit is Hester\'s.') : L('nell', 'Mists and Clocks, for one token. Bram at the curio shop hands them out for bottles with letters in, if you\'ve got one.')],
    ['lighthouse', 'Why is the lighthouse dark?', s => flag(s, 'lit') ? L('nell', 'It\'s lit! Hester came down the stairs singing. Never heard her sing before. Never want to again, but still.') : L('nell', 'Steward\'s orders. Hester says the lamp only takes true fire now, from the Clockmakers\' forge. And the Clockmakers have been stuck since the Steward\'s men visited. Funny, that.')],
    ['self', 'How long have you run the ferry?', () => L('nell', 'Thirty years. Seen four shipwrecks this month and one prince. You\'re the more surprising of the two.')]
  ] };

  TALKS.oracle = { prompt: 'Ask the Oracle about...', topics: s => [
    ['pearl', 'Varrick\'s black pearl?', () => L('oracle', 'Stolen from the queen of the mer-folk. It drinks the sea\'s magic. While it is whole, Varrick\'s spells cannot be fought. But they can be turned. Find the queen on the Coral Strand.')],
    ['king', 'Can the king be woken?', () => L('oracle', 'A sleep cast in the dark breaks at dawn. High on Sentinel Isle nests the roc, whose feathers hold the first light of morning. She gives them only to those who show her kindness.')],
    ['princess', 'Is Elowen in danger?', () => L('oracle', 'She is bound, not broken. She cannot think clearly near the pearl. But she remembers your face. Show her something of yours she would know.')],
    ['tunnel', 'How do I get into the castle?', () => L('oracle', 'The smugglers\' way, under the Singing Cliffs, opens to the whistle\'s song. It is dark beneath. Carry light that will not fail you.')]
  ] };

  TALKS.hester = { prompt: 'Ask Hester about...', topics: s => [
    ['map', 'How does the map work?', () => L('hester', 'Touch an island, under open sky, and it carries you there. Doesn\'t work indoors. Ink sulks without the wind.')],
    ['gull', flag(s, 'note_sent') ? 'Any word from the castle?' : 'Can you get a message into the castle?', s => {
      if (flag(s, 'got_reply')) return L('hester', 'Pip brought back that ribbon and the princess\'s letter, didn\'t he? Read it again, lad. Girls in towers notice things.');
      if (flag(s, 'note_sent')) return L('hester', 'Pip\'s still out. Gulls hate being watched. Go about your business, and come back after.');
      if (!has(s, 'parchment')) return L('hester', 'Pip, my gull, used to carry notes to the princess\'s tower window when she was small. He\'d go again, but you\'ll need something to write on. Bram trades in odds and ends.');
      lose(s, 'parchment'); set(s, 'note_sent'); pts(s, 'note', 3);
      return { say: ['You write a short note in charcoal: "Elowen, I saw you in the mirror. I am here, on your island. Tell me how to help you. Rowan of Thornmere."', ['hester', 'Pip! Off you go.'], 'A grey gull hops onto the window sill, takes the rolled note in its beak, and wheels away toward the castle towers.', ['hester', 'Give him time. Go see to your other business and come back.']] };
    }],
    ['bram', 'Bram says you owe him a kettle.', () => L('hester', 'Bram owes me thirty years of apologies. He can wait for his kettle.')]
  ] };

  TALKS.nerissa = { prompt: 'Ask Queen Nerissa about...', topics: s => [
    ['pearl', 'The stolen pearl?', () => L('nerissa', 'The heart of the sea\'s magic. Varrick took it from my coral throne while I slept. Every spell he casts draws on it. Turn his own magic back at it, and it will break.')],
    ['wardens', 'The Tide Wardens?', () => L('nerissa', 'My little guards. Very loyal, very silly. I hope you did not hurt them. Lick has never once been beaten by a pickle, he tells me. He will be unbearable now.')],
    ['varrick', 'Who is Varrick, really?', () => L('nerissa', 'A sea-witch\'s apprentice who ran away with his master\'s books. Proud, clever, and terrified of his own reflection. Sorcerers who steal always are.')]
  ] };

  TALKS.bertha = { prompt: 'Ask Bertha about...', topics: s => [
    ['elowen', 'The princess?', () => L('bertha', 'I\'ve cooked for that girl since she was in nappies. She\'s not herself. Walks like a sleepwalker. Varrick\'s done something to her, mark my words.')],
    ['varrick', 'The Steward?', () => L('bertha', 'Eats like a bird, sneers like a cat. Won\'t have a mirror in any room he uses. Had me take down the big one in the hall, the night before he took the chain.')],
    ['hound', 'That hound in the hall?', s => flag(s, 'hound') ? L('bertha', 'You put Brutus to sleep? You beautiful boy! He\'s eaten three of my pies this week.') : L('bertha', 'Brutus. Varrick\'s beast. Can\'t be bribed, can\'t be fought. But I\'ve seen him nod off when the minstrels play soft.')]
  ] };

  // Bram appraises anything you bring him, and his opinions are clues.
  const APPRAISE = {
    conch: 'Pretty, but I\'ve got a hundred of those. Now, the Oracle out on the Isle of Mists listens to shells. Says the sea tells her things.',
    ring: 'Keep that, lad. A crest like that might open doors someday. Or at least open a princess\'s eyes.',
    fish: 'I deal in treasures, not lunch. Though I\'ve heard rocs go mad for silver fish.',
    whistle: 'Mer-silver, that. Old smuggler work. The mer-folk on the Coral Strand used to rise for a tune played on one of those.',
    glowcap: 'Glowcap. Lights up a dark wood, or a dark tunnel. Spiders love them, I\'m told. Don\'t ask me how I know.',
    lantern: 'True fire from the Great Forge! Hester\'s been wanting that for six weeks.',
    emptylantern: 'Good brass. Empty, though. The Clockmakers\' forge fills lanterns with fire that never dies, when it\'s running.',
    prism: 'Hester\'s old lamp prism. Throw sunlight through that and you\'d blind a gull. Or anything with one big eye.',
    rattler: 'Pim\'s rattler! Don\'t you dare wind it in my shop. That thing could deafen a whale.',
    stinkhorn: 'Get that OUT. ...Well. If you ever need to knock out something with a big nose, that\'ll do it.',
    pickle: 'One of Marla\'s fire pickles? Nobody who\'s tasted one has ever forgotten it. Some of them are still running.',
    kelp: 'Cold, wet and clammy. Sea-folk feel like that. Land-folk don\'t.',
    feather: 'A dawn feather from the roc! My grandmother said one could wake anyone from an enchanted sleep. Don\'t you sell that. Not even to me.',
    mirror: 'Mer-queen\'s work. A true mirror. Magic can\'t pass through one, it bounces right back. Now who would be afraid of that, I wonder?',
    letter: 'Put that away before somebody sees it, lad. Show it to Captain Orla, nobody else. She\'s the only honest sword in that castle.',
    keys: 'Castle keys. I didn\'t see those. I didn\'t see you, either.',
    songsheet: 'Fennick\'s lullaby! He played it in here once and I woke up two days later.',
    tabard: 'A servant\'s tabard. Clever. Nobody ever looks at servants.',
    coin: 'Smuggler\'s gold! Toss it in the fountain for luck. That\'s what the old smugglers did.',
    thread: 'Spider silk! Fennick would give his left ear for that. Well, a song, anyway.',
    bun: 'One of Marla\'s buns? Save it. Goats, children and princes can\'t resist them.',
    oilcan: 'Pim\'s oil can. He\'ll want that back, so use it before he notices.',
    compass: 'Hester\'s map! She gave you that? You must have done something remarkable.',
    token: 'One of my own tokens! The ferrywoman takes those. Off you go, lad, the isles won\'t wait.',
    parchment: 'Good parchment, that. Hester\'s gull could carry a letter written on it, if you knew who to write to.',
    reply: 'A letter from the princess! Read it twice, lad. Girls in towers notice things.',
    ribbon: 'Sea-green silk, royal weave. That\'s the princess\'s ribbon. Anyone in the castle who loves her would know it.'
  };

  // ---- the Tide Wardens: one for each sense ----
  const WARDEN = (id, name, sense, rect, at, look, taunt, beat, wrong) => ({
    id, name, rect, at, gone: s => flag(s, 'w_' + id),
    look: () => say(look),
    talk: () => say([id, taunt]),
    hand: () => ({ die: 'You try to shove the ' + name + ' aside.\n\nThe Tide Wardens are small, but there are five of them, and they have been waiting all year for someone to drag into the lagoon.' }),
    item: (s, i) => {
      if (i !== beat[0]) return say([id, wrong]);
      lose(s, i); set(s, 'w_' + id); pts(s, 'w_' + id, 4);
      const lines = [beat[1]];
      if (!wardensLeft(s)) lines.push('The last of the Tide Wardens flees into the surf. The beach is clear, all the way to the lagoon.', ['rowan', 'Sight, hearing, smell, taste and touch. I\'ve never been so glad to own a pickle.']);
      return say(...lines);
    }
  });
  const WARDENS = [
    WARDEN('goggle', 'sight warden', 'sight', [104, 150, 24, 30], [116, 188], 'Goggle, the warden of sight: one huge unblinking eye, the size of a dinner plate.', 'I SEE you, land-folk! I see everything! Nothing gets past this eye!', ['prism', 'You hold Hester\'s prism up to the sun. A blaze of rainbow light flashes straight into Goggle\'s enormous eye.\n"AAGH! COLORS! TOO MANY COLORS!" He staggers in circles and dives into the sea.'], 'I can see that won\'t work!'),
    WARDEN('lugs', 'hearing warden', 'hearing', [134, 144, 26, 30], [146, 188], 'Lugs, the warden of hearing: two ears like sails, twitching at every sound.', 'I can hear your heart beating, land-folk! Ba-dum, ba-dum!', ['rattler', 'You wind Pim\'s rattler and set it down. It explodes into the most horrible racket ever made: bells, bangs, squeals and a noise like a goose falling down stairs.\nLugs clamps his ears shut, howls, and bolts into the waves.'], 'I hear you fumbling. Pathetic!'),
    WARDEN('snoot', 'smell warden', 'smell', [164, 150, 26, 30], [176, 188], 'Snoot, the warden of smell: a nose like a prize parsnip, sniffing the air constantly.', 'I smell land-folk! Sweat and leather and... is that a shipwreck?', ['stinkhorn', 'You wave the stinkhorn under Snoot\'s magnificent nose.\nHis eyes cross. His knees wobble. "That... is... the most beautiful..." he gasps, and keels over backwards into a tide pool. The others drag him away.'], 'Smells like failure!'),
    WARDEN('lick', 'taste warden', 'taste', [194, 144, 26, 30], [206, 188], 'Lick, the warden of taste: a tongue as long as your arm, licking everything in reach.', 'I taste intruders! Give me a lick and I\'ll know what you are!', ['pickle', 'You offer Lick the fire pickle. He snatches it and crunches it with relish.\nThere is a pause. His face goes pink, then red, then a purple you didn\'t know faces could go. Steam comes out of his ears. He sprints into the lagoon and stays under for a very long time.'], 'Tastes like a trick! Bleh!'),
    WARDEN('grabby', 'touch warden', 'touch', [222, 152, 28, 30], [232, 190], 'Grabby, the warden of touch: two huge, twitchy hands, always reaching.', 'Let me feel your hand, land-folk! Warm hands mean land-folk! Cold hands mean sea-folk!', ['kelp', 'You wrap your hand in the cold, slimy kelp and offer it to Grabby.\nHe shakes it. He shivers. "Oh! Cold and clammy! Sorry, cousin, didn\'t recognize you!" He waves you through and wanders off along the beach, still shaking out his fingers.'], 'Warm! Warm and land-ish! Nice try!')
  ];
  const wardensLeft = s => WARDENS.filter(w => !flag(s, 'w_' + w.id)).length;

  const ROOMS = {
    // ================= ISLE OF THE CROWN =================
    beach: {
      outdoors: true,
      name: 'Shipwreck Beach', isle: 'crown', scale: [138, 0.8, 194, 1.05],
      walk: [16, 138, 292, 194],
      block: [[0, 166, 52, 34]],
      enter: s => once(s, 'seen_beach', [
        'Salt water. Sand in places sand should never be. You are alive, which is more than can be said for your ship.',
        'Somewhere beyond these dunes is Elowen\'s castle. Time to find out whether she was worth a shipwreck.'
      ]),
      spots: [
        sea([0, 88, 320, 34]),
        { id: 'west', name: 'path to the cliffs', rect: [0, 110, 16, 56], at: [18, 150], exit: { to: 'cliffs', x: 290, y: 168 } },
        { id: 'east', name: 'path to the village', rect: [304, 110, 16, 90], at: [290, 170], exit: { to: 'square', x: 26, y: 172 } },
        {
          id: 'wreck', name: 'wreckage', rect: [30, 90, 85, 48], at: [80, 150],
          look: s => say(flag(s, 'ring_taken')
            ? 'What\'s left of the Gallant Stag. You\'ll miss her. You\'ve already taken anything worth taking.'
            : 'What\'s left of the Gallant Stag. Among the splintered planks, something gold catches the light.'),
          hand: s => {
            if (flag(s, 'ring_taken')) return say('Nothing else in the wreck but splinters and regret.');
            set(s, 'ring_taken'); gain(s, 'ring'); pts(s, 'ring', 4);
            return say('You dig through the splinters and find your signet ring, still on its chain. Your father would have been furious if you\'d lost it.');
          }
        },
        {
          id: 'bottle', name: 'bottle', rect: [190, 156, 20, 16], at: [196, 176], gone: s => flag(s, 'bottle_taken'),
          look: () => say('A green glass bottle, half buried in the sand. There\'s a note inside.'),
          hand: s => { set(s, 'bottle_taken'); gain(s, 'bottle'); pts(s, 'bottle', 4); return say('You pull the bottle out of the sand. The cork won\'t budge, but the note inside looks old.'); }
        },
        {
          id: 'conch', name: 'conch shell', rect: [250, 172, 22, 16], at: [256, 186], gone: s => flag(s, 'conch_taken'),
          look: () => say('A large pink conch shell, bigger than your hand.'),
          hand: s => { set(s, 'conch_taken'); gain(s, 'conch'); pts(s, 'conch', 4); return say('You pick up the conch. When you hold it near your ear you could swear the sea is whispering a name.'); }
        },
        { id: 'sea', name: 'sea', rect: [0, 78, 320, 36], look: () => say('The sea that ate your ship looks perfectly innocent now. Typical.'), hand: () => say('You\'ve had quite enough of the sea for one day.') }
      ]
    },

    cliffs: {
      outdoors: true,
      name: 'The Singing Cliffs', isle: 'crown', scale: [135, 0.82, 194, 1.05],
      walk: [55, 135, 306, 194],
      spots: [
        { id: 'east', name: 'path to the beach', rect: [306, 120, 14, 80], at: [304, 168], exit: { to: 'beach', x: 24, y: 168 } },
        {
          id: 'door', name: 'carved door', rect: [222, 50, 58, 82], at: [250, 142],
          look: s => say(flag(s, 'door_open')
            ? 'The stone door stands open. A cold draft breathes out of the dark.'
            : 'A doorway carved into the cliff, framed by a ring of carved musical notes. In the middle is a small round hole, about the size of a whistle\'s mouth.'),
          hand: s => flag(s, 'door_open') ? say('It\'s already open.') : say('You push. You pull. The door has clearly been a cliff for a very long time and intends to stay one.'),
          talk: s => flag(s, 'door_open') ? say('The darkness does not answer.') : say(['rowan', 'Open sesame?'], 'Nothing. Worth a try.'),
          item: (s, i) => {
            if (i !== 'whistle') return null;
            if (flag(s, 'door_open')) return say('The door is already open.');
            set(s, 'door_open'); pts(s, 'door', 6);
            return say('You put the silver whistle to your lips and play the three etched notes. The carved notes on the rock glow one by one, and with a deep grinding sound the door rolls aside.');
          },
          walk: s => {
            if (!flag(s, 'door_open')) return null;
            if (!has(s, 'glowcap') && !has(s, 'lantern')) return { die: 'You step into the pitch-black tunnel. Three steps in, the floor stops. You don\'t.\n\nNext time, maybe bring a light.' };
            return { go: { to: 'tunnel', x: 30, y: 172 } };
          }
        },
        {
          id: 'edge', name: 'cliff edge', rect: [0, 115, 48, 85],
          look: () => say('A sheer drop to the rocks and surf far below. Gulls wheel beneath you. Beneath you!'),
          hand: () => ({ die: 'You decide to climb down the cliff for a better look.\n\nYou get a much better look, very quickly.' }),
          walk: () => say('You get as close to the edge as your stomach allows, which isn\'t very close.')
        },
        { id: 'sea', name: 'sea', rect: [0, 60, 190, 50], look: () => say('The Tidewater Isles dot the horizon: one wrapped in purple mist, one bristling with tiny towers, one a single great spire of rock.') }
      ]
    },

    square: {
      outdoors: true,
      name: 'Saltmarrow Village', isle: 'crown', scale: [160, 0.9, 194, 1.04],
      walk: [12, 160, 250, 194],
      block: [[166, 150, 76, 20]],
      enter: s => once(s, 'seen_square', ['The village of Saltmarrow huddles under the castle walls. Bunting hangs everywhere, but nobody looks very festive.']),
      spots: [
        { id: 'west', name: 'path to the beach', rect: [0, 150, 12, 50], at: [14, 176], exit: { to: 'beach', x: 294, y: 170 } },
        { id: 'south', name: 'road to the docks', rect: [60, 194, 180, 6], at: [120, 192], exit: { to: 'docks', x: 30, y: 168 } },
        { id: 'inn', name: 'the Drowned Sailor inn', rect: [112, 122, 26, 40], at: [125, 168], exit: { to: 'inn', x: 30, y: 178 }, look: () => say('A crooked door under a sign of a sailor waving cheerfully from inside a shark.') },
        { id: 'shop', name: 'curio shop', rect: [46, 116, 32, 52], at: [62, 170], exit: { to: 'shop', x: 40, y: 178 },
          look: () => say('A crooked little shop. The sign reads "BRAM\'S CURIOS — Treasures of the Tide."') },
        {
          id: 'board', name: 'notice board', rect: [152, 118, 28, 22], at: [150, 174],
          look: s => { pts(s, 'board', 2); return say('A freshly nailed decree: "BY ORDER OF THE GRAND STEWARD. Princess Elowen will wed Grand Steward Varrick at sundown. All rejoice. Rejoicing is mandatory."', 'Below it, an older notice, half torn: "...the King\'s sudden illness... no visitors..."'); },
          hand: () => say('Tearing down royal decrees is the sort of thing that gets you noticed by guards.')
        },
        {
          id: 'fountain', name: 'fountain', rect: [164, 115, 80, 55], at: [205, 178],
          look: () => say('A fountain of a leaping dolphin. Its basin is full of coins tossed in for luck.'),
          item: (s, i) => { if (i !== 'coin') return null; lose(s, 'coin'); pts(s, 'wish', 2); return say('You flip the smuggler\'s coin into the fountain and make a wish. You won\'t say what it was, but it has copper hair.'); },
          hand: () => ({ die: 'You scoop a handful of coins from the fountain. The guards at the gate are on you in seconds.\n\n"Robbing the Wishing Fountain on the princess\'s wedding day? The Steward will love this."\n\nYou spend the rest of your life in the Steward\'s dungeon, wishing.' })
        },
        {
          id: 'guards', name: 'castle guards', rect: [252, 110, 68, 58], at: [240, 176],
          look: () => say('Two guards in sea-green armor stand at the castle gate, looking as bored as only gate guards can.'),
          talk: s => flag(s, 'lit') ? say(['guard', 'Nobody enters till after the wedding. And no, we don\'t know who lit the lighthouse. The Steward\'s been shouting about it all afternoon.'], ['guard', 'Sundown\'s not far off now. Move along.']) : say(['guard', 'By order of the Grand Steward, nobody enters the castle until after the wedding. Move along.']),
          hand: () => say('The guards have spears. You have hands. You decide against it.'),
          item: (s, i) => {
            if (i === 'ring') return say(['guard', 'A Thornmere signet? Lad, rings wash up on this beach every week. Move along.'], 'They don\'t even look at it properly.');
            if (i === 'letter') return say(['guard', 'Letters go through the Steward\'s office.'], 'Handing proof of the Steward\'s treachery to the Steward\'s office seems unwise.');
            return say(['guard', 'Not interested.']);
          }
        },
        { id: 'castle', name: 'castle', rect: [220, 0, 100, 95], look: () => say('Tidewater Castle rises above the village, all white towers and sea-green banners. The tallest tower has no windows lit at all.') }
      ]
    },

    shop: {
      name: "Bram's Curios", isle: 'crown',
      walk: [20, 160, 176, 194],
      enter: s => once(s, 'seen_shop', ['The shop is crammed with nets, shells, ship\'s wheels and a stuffed fish that seems to be judging you. An old man peers over the counter.']),
      spots: [
        { id: 'door', name: 'door', rect: [18, 30, 40, 130], at: [36, 176], exit: { to: 'square', x: 36, y: 156 } },
        {
          id: 'bram', name: 'Old Bram', rect: [234, 66, 34, 52], at: [170, 180],
          look: () => say('Old Bram has a beard like a sea-sponge and the squint of a man who has been appraising junk for sixty years.'),
          talk: s => openTalk(s, 'bram', flag(s, 'met_bram') ? null : (set(s, 'met_bram'), L('bram', 'Welcome, welcome! Bram\'s Curios. Bram buys what the sea brings, and trades it for what you need.'))),
          hand: () => say('Bram is not for sale.'),
          item: (s, i) => {
            if (i === 'bottle') {
              lose(s, 'bottle'); gain(s, 'token'); set(s, 'traded'); pts(s, 'token', 6);
              return say('Bram\'s eyes light up. He works the cork out with his teeth and reads the note aloud.', ['bram', '"Dear Mum, the voyage is going fine, no need to worry. P.S. Please feed my goat." Beautiful!'], ['bram', 'Here, lad, a ferry token as promised. The ferrywoman at the docks will take you out to the near isles.']);
            }
            if (i === 'seaglass') { lose(s, 'seaglass'); gain(s, 'parchment'); set(s, 'traded_glass'); pts(s, 'glass', 2); return say(['bram', 'Coral Strand sea glass! Lovely. A fair trade, lad: parchment and a stick of charcoal.'], ['bram', 'Writing to someone? Hester at the lighthouse keeps a gull that used to carry notes up to the castle. Just saying.']); }
            return say(['bram', APPRAISE[i] || 'Not much call for that, I\'m afraid.']);
          }
        },
        { id: 'book', name: 'guidebook', rect: [190, 106, 22, 12], at: [170, 180], look: () => say('A battered pamphlet on the counter: "A TRAVELLER\'S GUIDE TO THE TIDEWATER ISLES."', '"The Isle of Mists: home of the Oracle. Do not follow the lights. The Isle of Clocks: home of the Clockmakers, whose forge-fire never dies. Sentinel Isle: two stone guardians, one of whom always lies. The Coral Strand: where the mer-folk answer only to music."'), hand: () => say(['bram', 'That\'s the shop copy. Read, don\'t take.']) },
        { id: 'shelf', name: 'shelves', rect: [80, 20, 140, 100], look: () => say('Ship in a bottle. Shrunken coconut. A mermaid\'s comb, price on request. A sign: "YOU BREAK IT, YOU SWIM FOR IT."'), hand: () => say('Bram clears his throat meaningfully.') },
        { id: 'fish', name: 'stuffed fish', rect: [240, 20, 72, 32], look: () => say('It stares at you with glassy disapproval. You stare back. You lose.') }
      ]
    },

    docks: {
      outdoors: true,
      name: 'Saltmarrow Docks', isle: 'crown', scale: [148, 0.85, 194, 1.04],
      walk: [20, 148, 300, 194],
      spots: [
        sea([0, 78, 320, 62]),
        { id: 'west', name: 'road to the village', rect: [0, 140, 14, 60], at: [22, 170], exit: { to: 'square', x: 160, y: 186 } },
        { id: 'shore', name: 'path to the lighthouse', rect: [0, 194, 200, 6], at: [100, 192], exit: { to: 'lighthouse', x: 40, y: 176 } },
        {
          id: 'nell', name: 'ferrywoman', rect: [188, 100, 26, 50], at: [184, 162],
          look: () => say('A weathered ferrywoman in an oilskin coat, chewing on an unlit pipe.'),
          talk: s => openTalk(s, 'nell', flag(s, 'met_nell') ? null : (set(s, 'met_nell'), L('nell', 'Ferry to the near isles. One token. No token, no boat. No exceptions, not even for handsome shipwrecked fellows.'))),
          item: (s, i) => {
            if (i === 'token') { lose(s, 'token'); set(s, 'paid'); pts(s, 'paid', 4); return say('She bites the token, nods, and pockets it.', ['nell', 'That buys you as many trips as you like today. Climb aboard when you\'re ready.']); }
            if (i === 'ring') return say(['nell', 'Pretty. Not a token.']);
            return say(['nell', 'Don\'t want it.']);
          }
        },
        { id: 'boat', name: 'ferry boat', rect: [205, 40, 60, 105], at: [214, 156], look: () => say('A sturdy little ferry with a patched sail.'), hand: boatFrom('docks'), walk: boatFrom('docks') },
        { id: 'sea', name: 'sea', rect: [0, 60, 320, 40], look: () => say('Islands scattered to the horizon. Off to the south, a lighthouse stands dark against the sky.') }
      ]
    },

    lighthouse: {
      name: 'The Lighthouse', isle: 'crown',
      walk: [50, 150, 300, 194],
      block: [[136, 152, 44, 40]],
      enter: s => (flag(s, 'note_sent') && flag(s, 'note_away') && !flag(s, 'got_reply')) ? (set(s, 'got_reply'), gain(s, 'reply'), gain(s, 'ribbon'), pts(s, 'reply', 4), ['As you reach the top of the stairs, a grey gull swoops in through the window and drops a folded letter and a sea-green ribbon at your feet.', ['hester', 'Pip\'s back! And he\'s brought you an answer, by the look of it.'], 'The letter is from Elowen. Read it in your bag.']) : once(s, 'seen_lh', ['You climb a hundred and twelve steps. You count them, twice, out of spite. At the top is the great lamp, cold and dark, and a woman with a telescope.']),
      spots: [
        { id: 'down', name: 'stairs down', rect: [8, 40, 40, 150], at: [56, 176], exit: { to: 'docks', x: 100, y: 186 } },
        {
          id: 'hester', name: 'Hester', rect: [202, 120, 28, 52], at: [196, 182],
          look: () => say('Hester the lighthouse keeper: brass buttons, a wind-burned face, and a scowl aimed at the dark lamp.'),
          talk: s => flag(s, 'lit')
            ? openTalk(s, 'hester')
            : say(['hester', 'Six weeks ago the Steward ordered my light put out. Said it "confused the fish." Since then, three ships have hit the rocks.'], ['hester', 'Yours makes four, by the look of you.'], ['hester', 'And the flame won\'t catch from any common fire now. It needs true fire, from the Clockmakers\' forge. Bring me that and I\'ll give you anything I own.']),
          hand: () => say('Hester gives you a look that could relight the lamp on its own.'),
          item: (s, i) => i === 'lantern' ? lightLamp(s) : i === 'emptylantern' ? say(['hester', 'An empty lantern won\'t light anything, lad. It needs true fire in it.']) : i === 'ring' ? say(['hester', 'Thornmere! So you\'re the prince from the wreck. Shame about your ship. Shame about my light.']) : say(['hester', 'What would I want with that?'])
        },
        {
          id: 'lamp', name: 'great lamp', rect: [125, 5, 70, 110], at: [122, 172],
          look: s => say(flag(s, 'lit') ? 'The great lamp blazes, throwing its beam across the sea.' : 'A huge glass lens around an empty wick. Cold as a fish.'),
          hand: () => say('You poke the wick. It remains a wick.'),
          item: (s, i) => i === 'lantern' ? lightLamp(s) : i === 'glowcap' ? say('The glowcap gives a cosy green glow. Ships would think the lighthouse had a cold.') : null
        },
        { id: 'window', name: 'window', rect: [80, 35, 220, 85], look: () => say('Through the window: the whole archipelago, laid out like a map.') }
      ]
    },

    // ================= ISLE OF MISTS =================
    mistshore: {
      outdoors: true,
      name: 'Isle of Mists', isle: 'mists', scale: [145, 0.85, 194, 1.04],
      walk: [12, 145, 300, 194],
      block: [[228, 172, 92, 28]],
      enter: s => once(s, 'seen_mist', ['The mist is so thick you could spread it on bread. Strange lights drift between the trees.']),
      spots: [
        { id: 'boat', name: 'ferry boat', rect: [232, 168, 88, 32], at: [222, 180], look: () => say('The ferry bobs at the shore. The ferrywoman is pretending not to be nervous.'), hand: boatFrom('mists'), walk: boatFrom('mists') },
        { id: 'west', name: 'path into the Mistwood', rect: [0, 120, 12, 80], at: [14, 168], exit: { to: 'mistwood', x: 294, y: 170 } },
        { id: 'cave', name: 'grotto', rect: [140, 82, 52, 52], at: [165, 148], exit: { to: 'oracle', x: 160, y: 188 }, look: () => say('A grotto mouth, its stones carved with eyes. Very welcoming.') },
        {
          id: 'glowcaps', name: 'glowing mushrooms', rect: [8, 130, 40, 34], at: [36, 172],
          look: s => say(has(s, 'glowcap') ? 'Glowcaps. You\'ve already picked one; that\'s plenty.' : 'A clump of mushrooms glowing a soft green. Handy in the dark.'),
          hand: s => { if (has(s, 'glowcap')) return say('One glowcap is plenty. Leave some for the fairies.'); gain(s, 'glowcap'); pts(s, 'glowcap', 3); return say('You pick a plump glowcap. It keeps glowing in your hand.'); }
        },
        {
          id: 'wisp', name: 'floating light', rect: [228, 86, 40, 40],
          look: () => say('A bobbing blue light drifts just out of reach, beckoning. It seems very friendly. Suspiciously friendly.'),
          talk: () => say('The light giggles. Lights should not giggle.'),
          hand: () => ({ die: 'You follow the pretty light deeper into the mist. It leads you, giggling, straight into the bog.\n\nBram did tell you not to follow any lights.' }),
          walk: () => ({ die: 'You follow the pretty light deeper into the mist. It leads you, giggling, straight into the bog.\n\nBram did tell you not to follow any lights.' })
        }
      ]
    },

    oracle: {
      name: "The Oracle's Grotto", isle: 'mists',
      walk: [30, 158, 290, 194],
      spots: [
        { id: 'out', name: 'way out', rect: [0, 194, 320, 6], at: [160, 192], exit: { to: 'mistshore', x: 160, y: 154 } },
        {
          id: 'sibyl', name: 'Oracle', rect: [140, 70, 40, 48], at: [160, 164],
          look: () => say('An old woman sits cross-legged beside a glowing pool, her eyes milky white. She is looking right at you anyway.'),
          talk: s => {
            if (flag(s, 'pts_oracle')) return openTalk(s, 'oracle', flag(s, 'got_whistle') ? L('oracle', 'Gather what you need: true fire for the dark, dawn for the sleeper, a mirror for the sorcerer. The sun does not wait.') : L('oracle', 'Bring me the voice of the sea, Prince.'));
            pts(s, 'oracle', 3);
            return say(
              ['oracle', 'Rowan of Thornmere. The sea told me you would come.'],
              ['oracle', 'Hear the truth. The old king is not dead. He sleeps under a spell in the tallest tower, and Varrick is no mere steward. He is a sorcerer, and his power lives in a stolen black pearl.'],
              ['oracle', 'The gates are shut to you, but the old smugglers\' way runs beneath the Singing Cliffs. Its door opens only to a song.'],
              ['oracle', 'Bring me the voice of the sea, and I will give you the song.']
            );
          },
          hand: () => say('You don\'t poke oracles.'),
          item: (s, i) => {
            if (i === 'conch') {
              lose(s, 'conch'); gain(s, 'whistle'); set(s, 'got_whistle'); pts(s, 'whistle', 8);
              return say('The Oracle holds the conch to her ear and smiles.', ['oracle', 'Ah. The sea has been worried about you.'], 'She hands you a slender silver whistle.', ['oracle', 'Play its three notes at the Singing Cliffs. The mer-folk know the tune too.']);
            }
            if (i === 'ring') return say(['oracle', 'I know who you are, child. It is the princess who must see that.']);
            if (i === 'letter') return say(['oracle', 'Do not show it to me. Show it to someone who can arrest a Steward.']);
            return say(['oracle', 'That is not the voice of the sea.']);
          }
        },
        { id: 'pool', name: 'glowing pool', rect: [95, 120, 130, 30], look: () => say('In the pool you see a castle hall, a veiled bride, and a man in black smiling too widely. Behind them, a king asleep in a tower. The sun outside is low.'), hand: () => say('The water is ice cold. The vision shivers and fades, then returns.') }
      ]
    },

    // ================= ISLE OF CLOCKS =================
    clockharbor: {
      outdoors: true,
      name: 'Isle of Clocks', isle: 'clocks', scale: [150, 0.86, 194, 1.03],
      walk: [14, 150, 250, 194],
      enter: s => { pts(s, 'clocks', 2); return once(s, 'seen_clocks', ['A town of brass and copper, all gears and chimneys. Everyone in it is frozen in place: a baker mid-knead, a fishmonger mid-shout. Above it all, the great tower clock reads one minute to noon. It has, you suspect, for some time.']); },
      spots: [
        sea([292, 118, 28, 30]),
        { id: 'boat', name: 'ferry boat', rect: [262, 90, 52, 68], at: [246, 168], look: () => say('Your boat, waiting in the harbor.'), hand: boatFrom('clocks'), walk: boatFrom('clocks') },
        { id: 'tower', name: 'clock tower', rect: [124, 104, 30, 46], at: [140, 156], exit: { to: 'clocktower', x: 160, y: 188 }, look: s => say(flag(s, 'clock') ? 'The great clock ticks happily along.' : 'The tower door stands ajar. The great clock above it is stuck at one minute to noon.') },
        { id: 'clockface', name: 'clock face', rect: [122, 24, 32, 32], look: s => say(flag(s, 'clock') ? 'Tick, tock. Time is moving again.' : 'Eleven fifty-nine. Forever, apparently.') },
        { id: 'workshop', name: 'workshop', rect: [42, 108, 36, 42], at: [60, 156], exit: { to: 'workshop', x: 40, y: 178 }, look: () => say('A round door with a sign: "PIM — TINKER — KNOCK LOUDLY, I AM USUALLY UNDER SOMETHING."') },
        {
          id: 'fishmonger', name: 'fishmonger', rect: [188, 108, 26, 46], at: [196, 166],
          look: s => say(flag(s, 'clock') ? 'A cheerful fishmonger, back in business.' : 'A fishmonger, frozen mid-shout, holding up a silver fish.'),
          talk: s => {
            if (!flag(s, 'clock')) return say('He doesn\'t answer. He is very, very still.');
            if (has(s, 'fish') || flag(s, 'got_fish')) return say(['fishmonger', 'Enjoy the fish, hero!']);
            set(s, 'got_fish'); gain(s, 'fish'); pts(s, 'fish', 3);
            return say(['fishmonger', '...FRESH FISH! Oh! Was I stuck? You fixed the clock? Here, lad, take the best one. On the house!'], 'He hands you a plump silver fish.');
          },
          hand: s => say(flag(s, 'clock') ? 'Better to ask than grab.' : 'Taking a fish from a frozen man feels like stealing. Because it is.')
        },
        { id: 'folk', name: 'frozen townsfolk', rect: [82, 112, 22, 44], look: s => say(flag(s, 'clock') ? 'The baker is kneading dough as if nothing happened.' : 'A baker, frozen mid-knead. Flour hangs in the air around her like snow that forgot to fall.') }
      ]
    },

    workshop: {
      name: "Pim's Workshop", isle: 'clocks',
      walk: [20, 160, 300, 194],
      spots: [
        { id: 'door', name: 'door', rect: [8, 55, 40, 115], at: [36, 176], exit: { to: 'clockharbor', x: 48, y: 158 } },
        { id: 'back', name: 'back door to the Great Forge', rect: [292, 44, 28, 126], at: [298, 176], exit: { to: 'gearworks', x: 26, y: 176 } },
        {
          id: 'pim', name: 'Pim', rect: [188, 128, 26, 40], at: [180, 176],
          look: () => say('Pim the tinker: a gnome in goggles, two feet tall and nine-tenths beard.'),
          talk: s => {
            if (flag(s, 'clock') && !flag(s, 'got_lantern')) {
              set(s, 'got_lantern'); gain(s, 'emptylantern'); pts(s, 'lantern', 3);
              return say(['pim', 'You did it! I heard the tower start up. Everyone\'s moving again!'], ['pim', 'You\'ll want a reward. Here, my best lantern. Take it through my back door to the Great Forge and old Anvil will give it a living ember. True fire never goes out. Very good for dark tunnels. Also for lighthouses, if you know any lighthouse keepers.']);
            }
            if (flag(s, 'got_lantern')) return say(['pim', 'Off you go, off you go! I\'ve got forty-one clocks to reset.']);
            if (has(s, 'oilcan')) return say(['pim', 'The great gear, at the top of the tower! Oil it, and mind your fingers once it starts moving!']);
            gain(s, 'oilcan'); pts(s, 'oilcan', 4);
            return say(['pim', 'A visitor! A moving one! Most people stopped moving when the tower did.'], ['pim', 'The Steward\'s men came and poured sand in the great gear, and everything stopped. Everything except me. I keep my own clocks.'], ['pim', 'My knees won\'t manage the tower stairs. Take this oil can and oil the great gear for me, would you?']);
          },
          hand: () => say(['pim', 'Hands off the beard!']),
          item: (s, i) => i === 'ring' ? say(['pim', 'Lovely engraving. Shoddy clasp, though. I could fix that.']) : say(['pim', 'Fascinating. No.'])
        },
        {
          id: 'bench', name: 'workbench', rect: [60, 90, 120, 60], at: [110, 170],
          look: s => say(has(s, 'rattler') || flag(s, 'got_rattler') ? 'A clockwork bird with no head and a teapot with legs. The "DO NOT WIND" thing is gone, because you have it.' : 'A clockwork bird with no head. A teapot with legs. Something labelled "DO NOT WIND."'),
          hand: s => {
            if (flag(s, 'got_rattler')) return say(['pim', 'Don\'t touch the teapot. It bites.']);
            if (!flag(s, 'clock')) return say(['pim', 'Don\'t touch that! Or that! Especially not that!']);
            set(s, 'got_rattler'); gain(s, 'rattler');
            return say(['pim', 'Oh, you want the rattler? Take it, take it! It was supposed to be an alarm clock, but it\'s so loud it woke the dead in three villages. They complained.'], ['pim', 'Wind it if you ever need to deafen something. Not near me.']);
          }
        }
      ]
    },

    clocktower: {
      name: 'Inside the Clock Tower', isle: 'clocks',
      walk: [20, 158, 300, 194],
      spots: [
        { id: 'out', name: 'way out', rect: [0, 194, 320, 6], at: [160, 192], exit: { to: 'clockharbor', x: 140, y: 158 } },
        {
          id: 'gear', name: 'great gear', rect: [100, 40, 115, 110], at: [158, 168],
          look: s => say(flag(s, 'clock') ? 'The great gear turns smoothly, teeth whirling past. Probably best not to touch it.' : 'An enormous brass gear, gritty with sand and seized solid.'),
          hand: s => flag(s, 'clock') ? { die: 'You reach out to touch the turning gear.\n\nThe gear reaches back.\n\nThe Isle of Clocks will be hearing about this for years.' } : say('You heave at it. It does not heave back.'),
          item: (s, i) => {
            if (i !== 'oilcan') return null;
            if (flag(s, 'clock')) return say('It\'s running beautifully already.');
            set(s, 'clock'); lose(s, 'oilcan'); pts(s, 'clock', 8);
            return say('You oil every tooth of the great gear. Sand grinds, metal groans, and then, with a CLUNK you feel in your boots, the gear begins to turn.', 'Far above, the great clock strikes noon. Twelve booming notes roll across the island, and outside, the whole town starts moving again.', ['rowan', 'One island unfrozen. If only weddings could be stopped with an oil can.']);
          }
        },
        { id: 'gears', name: 'gears', rect: [200, 5, 95, 70], look: () => say('Gears driving gears driving gears. Somewhere in here, presumably, is the reason for all of it.') },
        { id: 'pendulum', name: 'pendulum', rect: [80, 15, 25, 120], look: s => say(flag(s, 'clock') ? 'The pendulum swings, steady as a heartbeat.' : 'A huge pendulum, hanging motionless.') }
      ]
    },

    // ================= SENTINEL ISLE =================
    sentbase: {
      outdoors: true,
      name: 'Sentinel Isle', isle: 'sentinels', scale: [150, 0.86, 194, 1.03],
      walk: [14, 150, 306, 194],
      enter: s => { delete s.flags.asked; return once(s, 'seen_sent', ['A single great spire of rock rises from the sea. Two stairways are cut into it, side by side, and at the foot of each stands a stone sentinel.', 'A plaque reads: "ONE OF US SPEAKS ONLY TRUTH. ONE OF US ONLY LIES. ONE STAIR IS SAFE. YOU MAY ASK ONE QUESTION."']); },
      spots: [
        sea([0, 128, 320, 20]),
        { id: 'boat', name: 'boat', rect: [16, 120, 60, 28], at: [60, 156], look: () => say('Your boat, waiting at the rocks.'), hand: boatFrom('sentinels'), walk: boatFrom('sentinels') },
        { id: 'granite', name: 'Granite, the left sentinel', rect: [96, 72, 30, 70], at: [110, 160], look: () => say('A sentinel of grey granite with a stern stone face. It guards the left stair.'), talk: s => sentinelAsk(s, 'granite'), hand: () => say('It\'s rock. You\'re not.') },
        { id: 'basalt', name: 'Basalt, the right sentinel', rect: [198, 76, 28, 62], at: [212, 160], look: () => say('A sentinel of black basalt with a sly stone smile. It guards the right stair.'), talk: s => sentinelAsk(s, 'basalt'), hand: () => say('It\'s rock. You\'re not.') },
        { id: 'left', name: 'left stair', rect: [124, 40, 36, 100], at: [138, 152], look: () => say('A stair cut into the rock, winding up to the left.'), walk: s => climb(s, 'left'), hand: s => climb(s, 'left') },
        { id: 'right', name: 'right stair', rect: [162, 40, 36, 100], at: [182, 152], look: () => say('A stair cut into the rock, winding up to the right.'), walk: s => climb(s, 'right'), hand: s => climb(s, 'right') },
        {
          id: 'kelp', name: 'kelp', rect: [262, 118, 56, 50], at: [246, 170],
          look: () => say('Long ropes of kelp draped over the rocks, cold and slick from the deep water.'),
          hand: s => { if (flag(s, 'got_kelp')) return say('You have plenty of kelp. Too much, some would say.'); set(s, 'got_kelp'); gain(s, 'kelp'); return say('You peel off a strip of kelp. It is shockingly cold, and clammy in a way that feels personal.'); }
        },
        { id: 'plaque', name: 'plaque', rect: [150, 126, 20, 14], at: [160, 154], look: () => say('"ONE OF US SPEAKS ONLY TRUTH. ONE OF US ONLY LIES. ONE STAIR IS SAFE. YOU MAY ASK ONE QUESTION."') }
      ]
    },

    aerie: {
      outdoors: true,
      name: "The Roc's Aerie", isle: 'sentinels', scale: [150, 0.85, 194, 1.03],
      walk: [20, 150, 300, 194],
      enter: s => { pts(s, 'aerie', 6); return once(s, 'seen_aerie', ['You reach the summit, wind howling. A nest the size of a cottage sits on the peak, and in it a fluffy chick as tall as you are, screeching for food.', 'High above, a vast golden bird circles. Its mother, presumably. She has noticed you.']); },
      spots: [
        { id: 'down', name: 'stairs down', rect: [0, 120, 18, 80], at: [22, 172], exit: { to: 'ledge', x: 272, y: 170 } },
        { id: 'nest', name: 'nest', rect: [130, 60, 180, 80], look: () => say('Woven from whole trees. Bones, shells, and a few golden feathers are tangled in it.') },
        {
          id: 'chick', name: 'roc chick', rect: [205, 70, 40, 34], at: [205, 160],
          look: s => say(flag(s, 'fed') ? 'The chick is full and drowsy, a happy ball of fluff.' : 'The chick is enormous, fluffy, and very, very hungry. It eyes you as though you might be lunch.'),
          talk: () => say('"PEEP," says the chick, at a volume that rattles your teeth.'),
          hand: s => flag(s, 'fed') ? say('You pat the chick. It purrs, which you didn\'t know birds could do.') : { die: 'You reach out to pat the chick.\n\nThe chick decides you are food.\n\nIn fairness, you did walk right up to its plate.' },
          item: (s, i) => {
            if (i !== 'fish') return say('The chick sniffs it and screeches louder.');
            lose(s, 'fish'); set(s, 'fed'); pts(s, 'feed', 4);
            return say('You toss the fish. The chick snaps it out of the air and swallows it whole, then gives a contented burp.', 'With a rush of wind, the mother roc lands on the rocks beside the nest. She studies you with an eye the size of a cartwheel, then dips her head.');
          }
        },
        {
          id: 'feathers', name: 'golden feathers', rect: [256, 78, 30, 20], at: [250, 165], gone: s => has(s, 'feather'),
          look: () => say('Golden feathers tangled in the nest, glowing faintly like morning light.'),
          hand: s => {
            if (!flag(s, 'fed')) return { die: 'You reach for a golden feather. The chick shrieks, "THIEF!" in bird.\n\nThe mother roc drops out of the sky like a thunderbolt and carries you off to a much smaller island, which is mostly beak.' };
            gain(s, 'feather'); pts(s, 'feather', 7);
            return say('The mother roc watches as you take a single golden feather. She doesn\'t object. A gift, for feeding her child.', 'It\'s warm, and glows like the first light of morning.');
          }
        },
        {
          id: 'roc', name: 'mother roc', rect: [30, 30, 120, 90],
          look: s => say(flag(s, 'fed') ? 'The mother roc rests on the rocks, golden and enormous, watching you with something like approval.' : 'A gigantic golden bird, circling. She hasn\'t decided about you yet.'),
          talk: s => say(flag(s, 'fed') ? 'She ruffles her feathers at you, almost politely.' : 'She screams. You take that as a no.')
        }
      ]
    },

    // ================= CORAL STRAND =================
    reef: {
      outdoors: true,
      name: 'The Coral Strand', isle: 'reef', scale: [145, 0.86, 194, 1.03],
      walk: [14, 145, 262, 194],
      block: [[14, 140, 90, 12]],
      enter: s => once(s, 'seen_reef', ['A beach of pink coral sand. Rocks curl out into a turquoise lagoon. It is beautiful, and completely deserted.', 'Then the sand erupts. Five knee-high creatures with fins for ears and seaweed for hair pop up in a line between you and the water.', ['goggle', 'HALT! We are the Tide Wardens! No land-folk may pass to the queen\'s lagoon!'], ['lugs', 'We\'d hear you!'], ['snoot', 'We\'d smell you!'], ['lick', 'We\'d taste you!'], ['grabby', 'We\'d FEEL you!'], 'Each one has one enormous feature: an eye, a pair of ears, a nose, a tongue, a pair of grabbing hands. Getting past all five is going to take some cunning.']),
      spots: [
        sea([0, 115, 320, 28], LAGOON_DEATH),
        { id: 'west', name: 'path to the tide pools', rect: [0, 150, 14, 50], at: [16, 170], walk: s => wardensLeft(s) ? say(['goggle', 'Oh no you don\'t!'], 'The wardens link arms and block the path.') : { go: { to: 'tidepools', x: 294, y: 172 } } },
        ...WARDENS,
        { id: 'boat', name: 'boat', rect: [268, 50, 52, 92], at: [250, 160], look: () => say('Your boat, waiting in the shallows.'), hand: boatFrom('reef'), walk: boatFrom('reef') },
        {
          id: 'lagoon', name: 'lagoon', rect: [0, 70, 320, 45], at: [140, 150],
          walk: () => ({ die: LAGOON_DEATH }),
          look: s => say(flag(s, 'summoned') ? 'The lagoon glitters around the mer-queen\'s rock.' : 'Clear turquoise water. Far below, you think you see towers made of coral.'),
          talk: s => flag(s, 'summoned') ? null : say(['rowan', 'Hello?'], 'The lagoon is unmoved. The guidebook said the mer-folk answer only to music.'),
          item: (s, i) => {
            if (i !== 'whistle') return null;
            if (wardensLeft(s)) return say('You raise the whistle, and five wardens scream "LAND-FOLK!" so loudly you can\'t hear yourself play. You\'ll have to deal with them first.');
            if (flag(s, 'summoned')) return say('Nerissa is already here.');
            set(s, 'summoned'); pts(s, 'summon', 4);
            return say('You play the three notes across the water. The lagoon goes still, then bubbles, and a woman with a crown of coral and a long silver tail rises and settles onto the rock.', ['nerissa', 'That song has not been played in a hundred years. Who are you, to know it?']);
          }
        },
        {
          id: 'nerissa', name: 'Queen Nerissa', rect: [150, 58, 50, 40], at: [170, 152], gone: s => !flag(s, 'summoned'),
          look: () => say('Nerissa, queen of the mer-folk. Her eyes are the deep green of the sea far from land.'),
          talk: s => flag(s, 'got_mirror') ? openTalk(s, 'nerissa', L('nerissa', 'What is cast at you, send home.'))
            : say(['nerissa', 'The Steward stole my black pearl, the heart of the sea\'s magic. With it he put the king to sleep and bent the princess to his will.'], ['nerissa', 'I will help you break him. But how do I know you are not one of his creatures?']),
          hand: () => say('You do not touch the queen of the sea uninvited.'),
          item: (s, i) => {
            if (i === 'ring') {
              if (flag(s, 'got_mirror')) return say(['nerissa', 'Yes, yes, a stag. I remember.']);
              set(s, 'got_mirror'); gain(s, 'mirror'); pts(s, 'mirror', 7);
              return say(['nerissa', 'The stag of Thornmere. An honest house.'], 'She dives, and returns with a shell polished to a perfect mirror.', ['nerissa', 'The pearl\'s magic cannot touch a true reflection. When Varrick casts at you, hold this up. What is cast at you, send home.']);
            }
            if (i === 'fish') return say(['nerissa', 'Those are my subjects.'], 'You put the fish away, embarrassed.');
            return say(['nerissa', 'I have no need of that.']);
          }
        },
        { id: 'pool', name: 'tide pool', rect: [14, 124, 90, 28], look: () => say('Tiny crabs, glowing anemones, and a starfish who seems to be having a better day than you.') }
      ]
    },

    // ================= NEW SCREENS =================
    inn: {
      name: 'The Drowned Sailor', isle: 'crown',
      walk: [20, 160, 180, 194],
      block: [[104, 158, 76, 18]],
      enter: s => once(s, 'seen_inn', ['The Drowned Sailor is warm, smoky and nearly empty. Everyone else is pretending to rejoice at the castle. A bard slumps by the fire, glaring at his lute.']),
      spots: [
        { id: 'out', name: 'door to the square', rect: [8, 40, 40, 140], at: [24, 176], exit: { to: 'square', x: 107, y: 158 } },
        {
          id: 'marla', name: 'Marla', rect: [236, 70, 30, 50], at: [178, 186],
          look: () => say('Marla the innkeeper: arms like a dockhand, apron like a battlefield.'),
          talk: s => {
            if (flag(s, 'got_bun')) return openTalk(s, 'marla');
            set(s, 'got_bun'); gain(s, 'bun'); pts(s, 'bun', 2);
            return say(['marla', 'A shipwreck survivor! You look half drowned. Here, a sweet bun, on the house.'], ['marla', 'Rejoice at the wedding? I\'d sooner rejoice at a funeral. The old king was good to this town, and now Varrick says he\'s too ill for visitors. Ill, my foot.']);
          },
          hand: () => say(['marla', 'Hands where I can see them, sailor.']),
          item: (s, i) => i === 'ring' ? say(['marla', 'Thornmere! The princess used to talk about a mirror and a prince. We all thought she was daydreaming.']) : i === 'coin' ? say(['marla', 'Keep your coin. Spend it on luck. The fountain likes coins.']) : say(['marla', 'I run an inn, not a pawnshop.'])
        },
        {
          id: 'fennick', name: 'Fennick the bard', rect: [52, 124, 26, 46], at: [80, 178],
          look: s => say(flag(s, 'strung') ? 'Fennick, happily tuning his newly strung lute.' : 'Fennick the bard, gloomy in a feathered cap. His lute is missing its highest string.'),
          talk: s => openTalk(s, 'fennick', flag(s, 'met_fennick') ? null : (set(s, 'met_fennick'), L('fennick', 'Snapped my silver string on a high note. The only thread fine enough to replace it is spider silk from the Mistwood.', 'Bring me some and I\'ll teach you a song worth knowing.'))),
          hand: () => say(['fennick', 'Careful! The lute is the only thing I own that\'s in tune.']),
          item: (s, i) => {
            if (i === 'thread') {
              lose(s, 'thread'); gain(s, 'songsheet'); set(s, 'strung'); pts(s, 'song', 5);
              return say('Fennick strings his lute with the spider silk. It shines like moonlight.', ['fennick', 'Perfect pitch! Listen to this.'], 'He plays the gentlest lullaby you have ever heard. Marla yawns. You yawn. A cat by the fire falls asleep mid-stretch.', ['fennick', 'The Lullaby of the Isles. My grandmother sang it to sea-serpents. Here, I\'ve written it out for you.']);
            }
            if (i === 'coin') return say(['fennick', 'A tip! Wonderful. But I\'d rather have a string.']);
            return say(['fennick', 'That won\'t fix a lute.']);
          }
        },
        {
          id: 'jar', name: 'pickle jar', rect: [278, 96, 24, 32], at: [178, 180],
          look: () => say('A big jar on the bar: "MARLA\'S FIRE PICKLES. EAT ONE, DRINK FREE. NOBODY HAS EVER DRUNK FREE."'),
          hand: s => { if (has(s, 'pickle') || flag(s, 'got_pickle')) return say(['marla', 'One per customer. For your own safety.']); set(s, 'got_pickle'); gain(s, 'pickle'); return say(['marla', 'Help yourself, love. Just don\'t eat it near the fire. Or near anything.'], 'You fish out a fire pickle. The jar seems relieved.'); }
        },
        { id: 'fire', name: 'fireplace', rect: [75, 25, 60, 115], look: () => say('A crackling fire. Above it hangs a painting of a very large fish that, according to the brass plaque, "GOT AWAY."') },
        { id: 'patrons', name: 'patrons', rect: [105, 115, 75, 60], look: () => say('An old sailor snores into his mug. Another is building a ship out of breadsticks. Neither looks like they\'ll be rejoicing today.') }
      ]
    },

    mistwood: {
      outdoors: true,
      name: 'The Mistwood', isle: 'mists', scale: [150, 0.86, 194, 1.03],
      walk: [12, 150, 306, 194],
      enter: s => once(s, 'seen_wood', ['Twisted trees crowd close, dripping with moss. Between two of them hangs an enormous web, shining with dew. Something large and many-legged sits at its center.']),
      spots: [
        { id: 'east', name: 'path to the shore', rect: [306, 120, 14, 80], at: [304, 170], exit: { to: 'mistshore', x: 20, y: 170 } },
        {
          id: 'weft', name: 'Madame Weft', rect: [144, 48, 34, 32],
          look: () => say('A spider the size of a carriage wheel, with a dozen glittering eyes and, somehow, a lace collar.'),
          talk: s => flag(s, 'got_thread')
            ? say(['weft', 'Run along, little fly. And mind my web.'])
            : say(['weft', 'Well, well. A fly that talks. How refreshing.'], ['weft', 'Silk, you say? I might spare a strand. My nights are so terribly dark in this wood. Bring me a little light and we shall bargain.']),
          item: (s, i) => {
            if (i === 'glowcap') {
              lose(s, 'glowcap'); gain(s, 'thread'); set(s, 'got_thread'); pts(s, 'thread', 6);
              return say('Madame Weft takes the glowcap delicately and sets it in the middle of her web like a lamp.', ['weft', 'Charming. A bargain is a bargain.'], 'She spins a single strand of silver silk and drops it into your hand. It is finer than hair and stronger than rope.');
            }
            if (i === 'lantern') return say(['weft', 'Fire? In a web? Are you mad?']);
            return say(['weft', 'That is not light, little fly.']);
          },
          hand: () => ({ die: 'You reach up to touch the spider.\n\nMadame Weft is delighted. It isn\'t often lunch introduces itself.' })
        },
        {
          id: 'web', name: 'web', rect: [112, 26, 106, 100], at: [162, 160],
          look: () => say('Dew-pearled silk, strand after strand, each one shining like silver thread.'),
          hand: () => ({ die: 'You reach out to pluck a strand of the web.\n\nThe web plucks back. You are now part of Madame Weft\'s collection, wrapped up snug for later.\n\nPerhaps she would have simply traded.' })
        },
        { id: 'trees', name: 'trees', rect: [0, 0, 100, 140], look: () => say('The trees are twisted into shapes that look almost like faces. Almost.') },
        {
          id: 'stinkhorn', name: 'stinkhorn mushroom', rect: [14, 112, 38, 68], at: [58, 176],
          look: () => say('A tall, slimy mushroom. Even from here it smells like a fish that died of embarrassment inside an old boot. Flies are fainting around it.'),
          hand: s => { if (flag(s, 'got_stink')) return say('One stinkhorn is more than enough for anybody.'); set(s, 'got_stink'); gain(s, 'stinkhorn'); return say('Holding your breath, you pick the stinkhorn. Your eyes water. Somewhere, a skunk is jealous.'); }
        }
      ]
    },

    gearworks: {
      name: 'The Great Forge', isle: 'clocks',
      walk: [16, 152, 304, 194],
      enter: s => once(s, 'seen_forge', [flag(s, 'clock') ? 'The Great Forge roars. A huge brass automaton works the bellows, humming to itself.' : 'An enormous furnace, cold and silent. A brass automaton the size of a wardrobe stands frozen beside it, one hand on the bellows.']),
      spots: [
        { id: 'west', name: 'back to the workshop', rect: [0, 120, 14, 80], at: [20, 176], exit: { to: 'workshop', x: 290, y: 178 } },
        {
          id: 'anvil', name: 'Anvil', rect: [198, 94, 36, 64], at: [196, 170],
          look: s => say(flag(s, 'clock') ? 'Anvil, the forge automaton, pumping the bellows in perfect time.' : 'A brass automaton, frozen mid-pump. A plate on its chest reads "ANVIL."'),
          talk: s => flag(s, 'clock')
            ? say(['anvil', 'GREETINGS. THE FORGE BURNS AGAIN. IF YOU REQUIRE TRUE FIRE, OFFER A VESSEL TO THE FLAMES.'])
            : say('Anvil is frozen solid, like everything else on this island.'),
          hand: s => flag(s, 'clock') ? say(['anvil', 'PLEASE DO NOT POLISH THE AUTOMATON DURING WORKING HOURS.']) : say('Cold brass.')
        },
        {
          id: 'forge', name: 'great forge', rect: [110, 40, 95, 110], at: [152, 160],
          look: s => say(flag(s, 'clock') ? 'The forge blazes white-gold. This is the true fire the stories talk about: it never goes out, and it burns only what it\'s told to.' : 'The furnace is cold. Ashes, but no ember.'),
          hand: s => flag(s, 'clock') ? { die: 'You reach into the Great Forge.\n\nIt was very clear about burning only what it\'s told to. Nobody told it not to burn you.' } : say('Cold ash. It gets all over your sleeve.'),
          item: (s, i) => {
            if (i !== 'emptylantern') return i === 'lantern' ? say('Your lantern already holds an ember.') : null;
            if (!flag(s, 'clock')) return say('The forge is cold. There\'s nothing to light it with.');
            lose(s, 'emptylantern'); gain(s, 'lantern'); pts(s, 'forge', 6);
            return say('You hold the empty lantern out to the forge.', ['anvil', 'VESSEL ACCEPTED.'], 'Anvil lifts a single living ember from the heart of the fire with brass tongs and drops it into your lantern. It burns steady and gold, and the brass stays cool in your hand.');
          }
        },
        { id: 'bellows', name: 'bellows', rect: [228, 95, 75, 55], look: () => say('Bellows the size of a rowboat. Anvil works them without ever getting tired, which seems unfair.') }
      ]
    },

    ledge: {
      outdoors: true,
      name: 'The Goat Ledge', isle: 'sentinels', scale: [144, 0.9, 152, 0.92],
      walk: [30, 144, 284, 152],
      enter: s => once(s, 'seen_ledge', ['Halfway up the spire, the stair narrows to a ledge barely wider than your boots. The sea is a very long way down. And blocking the ledge is a mountain goat, chewing thoughtfully and staring at you.']),
      spots: [
        { id: 'down', name: 'stair down', rect: [0, 145, 30, 55], at: [32, 150], exit: { to: 'sentbase', x: 120, y: 170 } },
        {
          id: 'up', name: 'stair up', rect: [268, 96, 52, 50], at: [282, 146],
          look: () => say('The stair continues up toward the summit.'),
          walk: s => flag(s, 'goat') ? { go: { to: 'aerie', x: 40, y: 172 } } : say('The goat is in the way. There is no way around a goat on a ledge this narrow.')
        },
        {
          id: 'goat', name: 'mountain goat', rect: [185, 118, 40, 34], at: [175, 148], gone: s => flag(s, 'goat'),
          look: () => say('A shaggy white goat with impressive horns and the expression of someone who has never once moved for anybody.'),
          talk: () => say(['rowan', 'Excuse me. Could I just squeeze past?'], 'The goat chews. The goat stares. The goat does not move.'),
          hand: () => ({ die: 'You try to shove the goat out of the way.\n\nThe goat tries to shove you out of the way.\n\nThe goat is better at it.' }),
          item: (s, i) => {
            if (i === 'bun') { lose(s, 'bun'); set(s, 'goat'); pts(s, 'goat', 5); return say('You hold out Marla\'s sweet bun. The goat sniffs it, snatches it, and trots happily up onto a rock above the ledge to eat it in peace.', 'The way is clear.', ['rowan', 'Bested by a bun. Father must never hear of this.']); }
            if (i === 'fish') return say('The goat looks deeply offended.');
            return say('The goat isn\'t interested. The goat has standards, and they involve pastry.');
          }
        },
        { id: 'goatrock', name: 'goat', rect: [185, 84, 40, 30], gone: s => !flag(s, 'goat'), look: () => say('The goat, perched on a rock, enjoying the bun far more than you did.') },
        { id: 'drop', name: 'drop', rect: [30, 155, 240, 45], look: () => say('Don\'t look down. You looked down. Why did you look down?') }
      ]
    },

    tidepools: {
      outdoors: true,
      name: 'The Tide Pools', isle: 'reef', scale: [150, 0.86, 194, 1.03],
      walk: [14, 150, 306, 194],
      block: [[50, 140, 130, 46], [14, 134, 82, 18]],
      spots: [
        sea([0, 86, 320, 60]),
        { id: 'east', name: 'back to the strand', rect: [306, 120, 14, 80], at: [304, 170], exit: { to: 'reef', x: 24, y: 172 } },
        {
          id: 'octopus', name: 'baby octopus', rect: [196, 166, 28, 18], at: [228, 180], gone: s => flag(s, 'octo'),
          look: () => say('A tiny purple octopus, stranded on the sand by the tide. It\'s drying out fast and looks very sorry for itself.'),
          talk: () => say(['rowan', 'Hang on, little fellow.'], 'It waves one tentacle feebly.'),
          hand: s => { set(s, 'octo'); pts(s, 'octo', 3); return say('You scoop up the little octopus and carry it to the nearest pool. It turns a happy shade of pink, squirts you in the face, and vanishes under a rock.', 'Ungrateful, but alive.'); }
        },
        {
          id: 'seaglass', name: 'sea glass', rect: [100, 182, 16, 10], at: [108, 190], gone: s => flag(s, 'got_glass'),
          look: () => say('Something glints green in the sand: a piece of sea glass, smooth as a sweet.'),
          hand: s => { set(s, 'got_glass'); gain(s, 'seaglass'); return say('You pick up a lovely piece of green sea glass. Bram would probably like this.'); }
        },
        { id: 'pools', name: 'tide pools', rect: [14, 132, 166, 54], look: () => say('Pools full of anemones, starfish and darting fish, all glowing faintly.') },
        { id: 'arch', name: 'rock arch', rect: [160, 14, 160, 100], look: () => say('A great arch of coral rock. Waves boom through it every few seconds.') }
      ]
    },

    corridor: {
      name: 'Servants\' Hall', isle: 'crown',
      walk: [16, 152, 304, 194],
      enter: s => once(s, 'seen_corr', flag(s, 'hound') ? null : ['A long stone hallway lit by torches. Doors lead off it, and at the far end an archway glows with light. In the middle of the floor lies a hound the size of a pony. It lifts its head and growls, low and long.']),
      spots: [
        { id: 'down', name: 'cellar stairs', rect: [0, 194, 140, 6], at: [60, 192], exit: { to: 'cellar', x: 266, y: 164 } },
        { id: 'kitchen', name: 'kitchen door', rect: [22, 44, 36, 108], at: [40, 160], walk: s => houndCheck(s, { to: 'kitchen', x: 30, y: 178 }), look: () => say('A door that smells of baking. Clattering pans behind it.') },
        { id: 'study', name: 'study door', rect: [178, 54, 48, 88], at: [200, 158], walk: s => houndCheck(s, flag(s, 'unlocked') ? { to: 'study', x: 30, y: 178 } : null), look: s => say(flag(s, 'unlocked') ? 'The door to Varrick\'s study, unlocked.' : 'A black door with a silver lock. A brass plate reads: "THE GRAND STEWARD. KNOCK AND REGRET IT."'),
          item: (s, i) => { if (i !== 'keys') return null; if (!flag(s, 'hound')) return houndCheck(s, null); if (flag(s, 'unlocked')) return say('It\'s already unlocked.'); set(s, 'unlocked'); return say('The third key you try turns with a satisfying click. The study door swings open.'); } },
        { id: 'arch', name: 'archway to the gallery', rect: [278, 36, 36, 126], at: [296, 166], walk: s => houndCheck(s, { to: 'gallery', x: 26, y: 178 }) },
        {
          id: 'hound', name: 'hound', rect: [124, 154, 56, 26],
          look: s => say(flag(s, 'hound') ? 'Varrick\'s hound, snoring like a landslide.' : 'A huge black hound with a spiked collar, watching your every move. Its growl never quite stops.'),
          talk: s => flag(s, 'hound') ? say('You whisper "good boy." It snores contentedly.') : say(['rowan', 'Good boy?'], 'The hound\'s growl gets louder. Not a good boy, apparently.'),
          hand: s => flag(s, 'hound') ? say('You don\'t pat sleeping hounds. Especially this one.') : { die: 'You reach out to pat the hound.\n\nThe hound reaches out to pat you, with its teeth.\n\nMarla did warn you.' },
          item: (s, i) => {
            if (i === 'songsheet') {
              if (flag(s, 'hound')) return say('It\'s already asleep.');
              set(s, 'hound'); pts(s, 'hound', 5);
              return say('You unfold Fennick\'s song sheet and, very quietly, sing the Lullaby of the Isles.', 'The hound\'s ears droop. Its eyes droop. Its whole enormous body droops. By the second verse it is flat on its side, snoring like a landslide.');
            }
            if (i === 'fish' || i === 'bun') return say('The hound isn\'t hungry. It\'s guarding. Big difference.');
            return { die: 'You wave it at the hound.\n\nThe hound takes this personally.' };
          }
        }
      ]
    },

    kitchen: {
      name: 'Castle Kitchen', isle: 'crown',
      walk: [20, 165, 300, 194],
      enter: s => once(s, 'seen_kitchen', ['The castle kitchen is chaos: copper pots, steaming cauldrons, and one red-faced cook shouting at a pudding.']),
      spots: [
        { id: 'out', name: 'door to the hall', rect: [8, 48, 48, 104], at: [26, 176], exit: { to: 'corridor', x: 86, y: 166 } },
        {
          id: 'bertha', name: 'Bertha the cook', rect: [205, 120, 30, 52], at: [196, 180],
          look: () => say('Bertha the cook: flour to the elbows and a wooden spoon held like a sword.'),
          talk: s => flag(s, 'got_tabard')
            ? openTalk(s, 'bertha', L('bertha', 'Go on, then! Stand up straight. Servants slouch, but not that much.'))
            : say(['bertha', 'Out! Out of my kitchen! I\'ve a wedding cake to finish for a wedding I want no part of.'], ['bertha', 'Wait. You\'re not one of Varrick\'s lot. Who are you, then?']),
          hand: () => say(['bertha', 'Touch me and you\'ll be wearing this spoon.']),
          item: (s, i) => {
            if (i === 'ring' || i === 'ribbon') {
              if (flag(s, 'got_tabard')) return say(['bertha', 'Yes, yes. Go!']);
              if (i === 'ribbon') { set(s, 'got_tabard'); gain(s, 'tabard'); pts(s, 'tabard', 6); return say(['bertha', 'That\'s my girl\'s ribbon! She sent you? Then you\'re the prince from the mirror.'], ['bertha', 'You\'ll never get past the guards at the Great Hall like that. Here, a servant\'s tabard. Head down, shoulders round, look miserable. You\'ll fit right in.']); }
              set(s, 'got_tabard'); gain(s, 'tabard'); pts(s, 'tabard', 6);
              return say(['bertha', 'The stag of Thornmere! The princess talked of nothing else for a week. The prince in the mirror!'], ['bertha', 'If you mean to stop this wedding, you\'ll never get past the guards at the Great Hall dressed like a drowned rat. Here, a servant\'s tabard. Put it on and keep your head down.']);
            }
            if (i === 'fish') return say(['bertha', 'Fish? At a wedding? Over my dead body. Well. Over Varrick\'s, preferably.']);
            return say(['bertha', 'I\'ve no use for that.']);
          }
        },
        { id: 'cake', name: 'wedding cake', rect: [118, 40, 44, 82], look: () => say('Seven tiers of sea-green icing, topped with tiny sugar figures of Varrick and Elowen. Someone has bitten the head off the sugar Varrick.'), hand: () => say(['bertha', 'Touch that cake and I\'ll bake you into the next one.']) },
        { id: 'hearth', name: 'hearth', rect: [200, 55, 100, 95], look: () => say('A huge hearth with a whole boar turning on a spit. It smells wonderful. You haven\'t eaten since the shipwreck.') },
        { id: 'pots', name: 'pots', rect: [10, 25, 180, 30], look: () => say('Copper pots, enough to cook for an army. Or for a wedding nobody wants.') }
      ]
    },

    study: {
      name: 'Varrick\'s Study', isle: 'crown',
      walk: [20, 165, 300, 194],
      block: [[118, 165, 130, 16]],
      enter: s => once(s, 'seen_study', ['Varrick\'s study: black curtains, a desk piled with papers, and shelves of books with titles like "On Persuasion" and "Sleep, Eternal." A raven watches you from a perch.']),
      spots: [
        { id: 'out', name: 'door', rect: [0, 120, 18, 80], at: [22, 178], exit: { to: 'corridor', x: 196, y: 166 } },
        {
          id: 'desk', name: 'desk', rect: [120, 108, 126, 72], at: [182, 186],
          look: s => say(flag(s, 'letter_found') ? 'The desk, its drawer hanging open where you found the letter.' : 'A heavy desk with one drawer. The papers on top are all decrees for Varrick to sign.'),
          hand: s => {
            if (flag(s, 'letter_found')) return say('The drawer is empty now.');
            set(s, 'letter_found'); gain(s, 'letter'); pts(s, 'letter', 6);
            return say('You slide open the drawer. Under a stack of blank decrees is a folded letter in Varrick\'s own hand. You read it, and your jaw tightens.', 'The king isn\'t dead. And here is the proof.', ['rowan', 'Elowen was right. Now to get this to someone who can use it.']);
          }
        },
        { id: 'raven', name: 'raven', rect: [56, 48, 28, 30], look: () => say('A glossy black raven with a silver ring on one leg. It watches you with one eye, then the other.'), talk: () => say('"STEWARD," croaks the raven. "STEWARD. STEWARD. SNACK?"'), hand: () => say('The raven pecks your knuckles. Fair enough.') },
        { id: 'books', name: 'bookshelves', rect: [245, 0, 75, 150], look: () => say('"On Persuasion." "Sleep, Eternal." "Pearls of the Deep, and How to Steal Them." Varrick\'s reading list explains a lot.') },
        { id: 'portrait', name: 'portrait', rect: [168, 28, 40, 50], look: () => say('A portrait of Varrick in a crown he has not got. Yet. The painter seems to have been nervous.') }
      ]
    },

    gallery: {
      name: 'The Long Gallery', isle: 'crown',
      walk: [16, 150, 304, 194],
      enter: s => once(s, 'seen_gallery', ['A long gallery hung with portraits of kings and queens. At the far end, two guards flank the great double doors of the Great Hall. Music drifts through them.']),
      spots: [
        { id: 'back', name: 'archway', rect: [0, 140, 14, 60], at: [20, 170], exit: { to: 'corridor', x: 296, y: 176 } },
        {
          id: 'doors', name: 'doors to the Great Hall', rect: [218, 14, 62, 112], at: [250, 156],
          look: () => say('Great carved doors, slightly ajar. Wedding music seeps through.'),
          walk: s => {
            if (!has(s, 'tabard')) return { die: 'You stroll toward the doors of the Great Hall.\n\n"Halt! Who are you?" The guards take one look at your salt-stained clothes and drag you to the dungeon.\n\nPerhaps you should have dressed for the occasion.' };
            pts(s, 'gallery', 4);
            return { say: ['You straighten your servant\'s tabard, lower your eyes and stride toward the doors like you belong there. The guards barely glance at you.'], go: { to: 'hall', x: 30, y: 180 } };
          }
        },
        { id: 'guards', name: 'guards', rect: [195, 90, 110, 55], look: s => say(has(s, 'tabard') ? 'Two bored guards. In your tabard, you\'re just another servant to them.' : 'Two guards, eyeing you suspiciously.'), talk: () => say(['guard', 'Move along. Ceremony\'s started.']) },
        { id: 'kings', name: 'portraits', rect: [0, 0, 200, 100], look: () => say('Kings and queens of the Tidewater Isles. The last portrait shows King Aldous: white-bearded, smiling, holding a little copper-haired girl on his knee.') }
      ]
    },

    // ================= THE CASTLE =================
    tunnel: {
      name: "Smugglers' Tunnel", isle: 'crown',
      walk: [16, 160, 300, 194],
      block: [[138, 150, 64, 30]],
      enter: s => { pts(s, 'tunnel', 3); return once(s, 'seen_tunnel', ['Your light shows a narrow tunnel. Just ahead, a crack in the floor drops into nothing at all. Good thing you brought a light.']); },
      spots: [
        { id: 'back', name: 'way out to the cliffs', rect: [0, 120, 16, 80], at: [20, 176], exit: { to: 'cliffs', x: 225, y: 152 } },
        { id: 'stairs', name: 'stairs up', rect: [200, 30, 100, 120], at: [230, 166], exit: { to: 'cellar', x: 30, y: 176 } },
        { id: 'scrawl', name: 'scratched writing', rect: [10, 30, 80, 70], look: () => say('Old smugglers\' graffiti: "GRUMBO WOZ ERE." And below: "NO HE WOZNT. — GRUMBO\'S MUM."') },
        { id: 'chasm', name: 'chasm', rect: [138, 128, 64, 52], look: () => say('A crack in the floor, black and bottomless. You keep well clear.'), hand: () => ({ die: 'You reach down into the chasm to see how deep it goes. You find out personally.' }) }
      ]
    },

    cellar: {
      name: 'Castle Cellar', isle: 'crown',
      walk: [20, 150, 300, 194],
      block: [[0, 150, 108, 26], [262, 160, 40, 22]],
      spots: [
        { id: 'back', name: 'tunnel', rect: [0, 176, 16, 24], at: [22, 188], exit: { to: 'tunnel', x: 248, y: 162 } },
        { id: 'stairs', name: 'stairs up', rect: [225, 40, 70, 100], at: [240, 156], exit: { to: 'corridor', x: 30, y: 176 } },
        { id: 'barrels', name: 'wine barrels', rect: [0, 55, 115, 120], look: () => say('Barrels of wedding wine. The Steward has spared no expense, mostly because it isn\'t his money.'), hand: () => say('Now is not the time to get drunk. Probably.') },
        {
          id: 'stone', name: 'loose stone', rect: [186, 66, 24, 16], at: [196, 156],
          look: s => say(flag(s, 'coin_found') ? 'An empty hole where the loose stone was.' : 'One stone in the wall sits a little crooked. Smugglers used to hide things in walls like this.'),
          hand: s => { if (flag(s, 'coin_found')) return say('The hiding place is empty now.'); set(s, 'coin_found'); gain(s, 'coin'); return say('You wiggle the stone loose. Behind it, some long-gone smuggler left a single gold coin. Finders keepers.'); }
        },
        {
          id: 'keys', name: 'key ring', rect: [278, 140, 14, 12], at: [256, 184], gone: s => flag(s, 'got_keys'),
          look: () => say('A big ring of keys hanging from the sleeping guard\'s belt.'),
          hand: s => { set(s, 'got_keys'); gain(s, 'keys'); pts(s, 'keys', 6); return say('Holding your breath, you ease the key ring off the guard\'s belt, one jingle-free inch at a time.', 'He snorts, mutters "more cake," and goes on snoring.'); }
        },
        {
          id: 'guard', name: 'sleeping guard', rect: [266, 120, 34, 52],
          look: () => say('A guard snoring on a stool, a half-empty mug of wedding wine at his feet.'),
          talk: () => ({ die: '"Excuse me," you say politely.\n\nThe guard wakes up, sees a stranger in the cellar, and shouts. Half the castle guard comes running.\n\nSome sleeping guards are best left lying.' }),
          hand: () => ({ die: 'You give the guard a friendly shake. He wakes up, takes one look at you, and bellows for help.\n\nSome sleeping guards are best left lying.' })
        }
      ]
    },

    hall: {
      name: 'The Great Hall', isle: 'crown', scale: [162, 0.9, 194, 1.03],
      walk: [60, 150, 262, 194],
      enter: s => once(s, 'seen_hall', [
        'You slip into the back of the Great Hall. The wedding is under way. A veiled princess stands at the altar beside a thin man in black: Grand Steward Varrick. A black pearl glints at his throat.',
        'Nobody has noticed you yet. You won\'t get long once they do.'
      ]),
      spots: [
        { id: 'down', name: 'doors to the gallery', rect: [0, 194, 320, 6], at: [160, 192], exit: { to: 'gallery', x: 200, y: 178 } },
        {
          id: 'varrick', name: 'Grand Steward Varrick', rect: [126, 92, 26, 60], at: [138, 170],
          look: () => say('Varrick: tall, thin, dressed in black on his own wedding day, with a smile like a crack in ice. The black pearl at his throat seems to drink the candlelight.'),
          talk: () => ({ die: '"I object!" you announce to Varrick.\n\n"Noted," says Varrick. "Guards, throw this objection into the sea."\n\nThey do. You have now been shipwrecked twice in one day.' }),
          hand: () => ({ die: 'You punch the groom. It is very satisfying for about two seconds.\n\nThe guards drag you off, and the Steward\'s smile is the last thing you see.' }),
          item: (s, i) => i === 'letter'
            ? { die: 'You wave the letter at Varrick. He plucks it from your hand, holds it to a candle, and smiles as it burns.\n\n"What letter?" he says, as the guards close in.' }
            : say('Varrick looks at it, and you, with polite contempt.')
        },
        {
          id: 'elowen', name: 'Princess Elowen', rect: [166, 92, 26, 60], at: [178, 170],
          look: s => say(flag(s, 'trust') ? 'Elowen has pushed back her veil. She is looking at you as if you were the only door out of a burning house.' : 'Princess Elowen, veiled in sea-green silk. She moves stiffly, like someone sleepwalking.'),
          talk: s => flag(s, 'trust') ? say(['elowen', 'Captain Orla commands the guard. If you have proof, give it to her.']) : say('You whisper her name. She turns slightly, but who would trust a soggy stranger at her own wedding?'),
          hand: () => say('Grabbing the bride in front of fifty guards is not the romantic gesture it sounds like.'),
          item: (s, i) => {
            if (i === 'ribbon' && !flag(s, 'trust')) { set(s, 'trust'); pts(s, 'trust', 8); return say('You hold up her own sea-green ribbon. Elowen\'s eyes widen, and for a moment the dull fog in them clears.', ['elowen', 'Pip found you. You came. You\'re real.'], ['elowen', 'He\'s done something to me. I can\'t think straight. Captain Orla commands the guard. If you have proof, give it to her.']); }
            if (i === 'ring') { set(s, 'trust'); pts(s, 'trust', 8); return say('You hold up your signet ring. Elowen catches her breath and lifts her veil. For a moment, the dull look in her eyes clears.', ['elowen', 'The leaping stag... I saw you. In the mirror, a month ago. You\'re real.'], ['elowen', 'He\'s done something to me. I can\'t think straight. Captain Orla commands the guard. If you have proof, give it to her.']); }
            if (i === 'letter') return say(['elowen', 'Give it to Orla. The guard obeys her, not me. Not today.']);
            return say('Elowen gives you a puzzled look.');
          }
        },
        {
          id: 'orla', name: 'Captain Orla', rect: [228, 100, 26, 62], at: [230, 174],
          look: () => say('Captain Orla of the guard: grey-haired, armored, and frowning at the ceremony as if it smells bad.'),
          talk: s => flag(s, 'trust') ? say(['orla', 'The princess vouches for you. That buys you one minute. What have you got?']) : say(['orla', 'Who let you in? Speak quickly, stranger, before I decide you\'re a threat.']),
          item: (s, i) => {
            if (i === 'letter') {
              if (!flag(s, 'trust')) return say(['orla', 'A forged scrap from a stranger who sneaked into the castle? Nice try.'], 'She doesn\'t even read it. You need someone she trusts to vouch for you.');
              lose(s, 'letter'); set(s, 'unmasked'); pts(s, 'unmask', 5);
              return {
                say: [
                  'Orla reads the letter. Her face goes from grey to red to a very dangerous white.',
                  ['orla', 'The king... alive? Varrick! Guards, seize the Steward!'],
                  ['varrick', 'Oh, I think not.'],
                  'The black pearl at Varrick\'s throat blazes. Thunder cracks inside the hall. When the smoke clears, Varrick and Elowen are gone, and the door to the tower stair is swinging open.',
                  ['orla', 'The tower! Go, Thornmere! My guards will hold the stair behind you!']
                ],
                go: { to: 'tower', x: 40, y: 178 }
              };
            }
            if (i === 'ring') return say(['orla', 'Fine ring. Means nothing to me. Means something to the princess, maybe.']);
            return say(['orla', 'Not now.']);
          }
        },
        { id: 'altar', name: 'altar', rect: [130, 85, 60, 40], look: () => say('Sea-green banners, piles of lilies, and a huge cake shaped like the castle. Somebody worked hard on this wedding. Shame about the groom.') }
      ]
    },

    tower: {
      name: 'The Sorcerer\'s Tower', isle: 'crown', scale: [160, 0.9, 194, 1.03],
      walk: [20, 160, 300, 194],
      enter: s => once(s, 'seen_tower', [
        'You burst into the top of the tower. Storm clouds boil past the windows. On a stone bier lies an old man in a crown, sleeping. Elowen stands frozen in a cage of black light.',
        ['varrick', 'The Thornmere boy. You came all this way to die in a tower. How romantic.'],
        'The black pearl at his throat begins to glow. He raises his hands. You have one heartbeat to act.'
      ]),
      spots: [
        { id: 'down', name: 'stairs down', rect: [0, 25, 26, 140], at: [28, 176], walk: s => flag(s, 'beaten') ? { choose: leaveChoice } : say('Varrick\'s magic has sealed the door behind you.') },
        {
          id: 'varrick', name: 'Varrick', rect: [222, 92, 34, 72], at: [214, 180], gone: s => flag(s, 'beaten'),
          look: () => say('Varrick, crackling with dark lightning. The black pearl blazes at his throat.'),
          talk: () => ({ die: '"Let\'s talk about this," you begin.\n\nVarrick doesn\'t. The bolt of black lightning is the last thing you see.\n\nWhat is cast at you, someone once said, send home.' }),
          hand: () => ({ die: 'You charge Varrick. He flicks a finger, and you become a very surprised-looking sea urchin.\n\nWhat is cast at you, someone once said, send home.' }),
          item: (s, i) => {
            if (i === 'mirror') {
              set(s, 'beaten'); pts(s, 'defeat', 12);
              return say('Varrick hurls a bolt of black lightning. You raise the mirror shell.', 'The bolt strikes the shell, rebounds, and slams into the black pearl at Varrick\'s throat. The pearl cracks, then shatters with a sound like breaking ice.', ['varrick', 'No... NO!'], 'Varrick shrinks, and shrinks, and when the light fades there is nothing on the floor but a small, furious crab, clicking at you.', 'The black cage around Elowen dissolves. She stumbles into your arms.');
            }
            return { die: 'You hold it up at Varrick. He seems unimpressed. The bolt of black lightning is the last thing you see.\n\nWhat is cast at you, someone once said, send home.' };
          }
        },
        { id: 'crab', name: 'crab', rect: [222, 172, 24, 14], gone: s => !flag(s, 'beaten'), look: () => say('Formerly the Grand Steward. Currently a crab. He clicks at you menacingly, which is less menacing than it used to be.'), hand: () => say('You scoop up the crab and drop it out the window into the sea. It seems the kindest thing for everyone, especially you.') },
        {
          id: 'elowen', name: 'Elowen', rect: [270, 96, 28, 66], at: [262, 182],
          look: s => say(flag(s, 'beaten') ? 'Elowen, free and fierce, with storm-tangled hair. Her eyes are clear now.' : 'Elowen, frozen in a cage of crackling black light.'),
          talk: s => flag(s, 'beaten')
            ? say(['elowen', 'Rowan. You came.'], ['elowen', 'My father... Varrick told everyone he was dying. He\'s only sleeping. Please, is there anything that can wake him?'])
            : say('She can\'t hear you through the spell.'),
          hand: s => flag(s, 'beaten') ? say('You take her hand. It\'s cold, but it squeezes back.') : say('The black light stings your fingers.')
        },
        {
          id: 'king', name: 'sleeping king', rect: [45, 95, 105, 60], at: [100, 170],
          look: () => say('King Aldous of the Tidewater Isles, white-bearded and pale, sleeping a spell-sleep. Dark threads of magic wind around him.'),
          talk: () => say(['rowan', 'Your Majesty?'], 'He doesn\'t stir. This sleep is not the ordinary kind.'),
          hand: () => say('You shake his shoulder gently. Nothing.'),
          item: (s, i) => {
            if (i !== 'feather') return null;
            if (!flag(s, 'beaten')) return say('Varrick\'s magic crackles between you and the bier. Deal with the sorcerer first.');
            lose(s, 'feather'); s.won = 'long'; pts(s, 'king', 12);
            return { say: [
              'You lay the Feather of Dawn on the sleeping king\'s chest. Golden light spills out of it like sunrise. The dark threads around him burn away.',
              'Outside, the storm clouds tear open, and real sunlight floods the tower.',
              'King Aldous opens his eyes.',
              ['king', 'Elowen? Who is... why is there a soggy young man holding my daughter\'s hand?'],
              ['elowen', 'Father, this is Rowan of Thornmere. He saved us both.'],
              ['king', 'Did he, now. Well. It seems there\'s a wedding already decorated downstairs. Shame to waste the cake.']
            ], win: 'long' };
          }
        },
        { id: 'book', name: 'spellbook', rect: [170, 88, 46, 24], look: () => say('Varrick\'s spellbook, open to a page titled "SLEEP ETERNAL, AND HOW TO PROFIT FROM IT."'), hand: () => say('Best not. Whatever is in that book is the reason for everything.') }
      ]
    }
  };

  function lightLamp(s) {
    if (flag(s, 'lit')) return say('The lamp is already blazing.');
    set(s, 'lit'); set(s, 'compass'); gain(s, 'compass'); gain(s, 'prism'); pts(s, 'lit', 6); pts(s, 'compass', 4);
    return say('You hand Hester the forge lantern. She opens the great lamp, touches the ember to the wick, and with a WHUMP the lighthouse blazes back to life, throwing its beam across the sea.', ['hester', 'True fire. Ha! Let the Steward complain about the fish now.'], 'She hands the lantern back. A spark was all the great lamp needed.', ['hester', 'I promised anything I own. Take my magic map. My grandmother had it off a sea-witch. Touch an island on it, under open sky, and it\'ll carry you there.'], ['hester', 'And take this old prism. It cracked years ago, so I swapped it out, but it still throws a flash that could blind a gull.'], 'You can now use the magic map from any outdoor screen. Look for the map button on your icon bar.');
  }

  function houndCheck(s, go) {
    if (!flag(s, 'hound')) return { die: 'You try to slip past the hound.\n\nYou do not slip past the hound.\n\nSomewhere, Marla is shaking her head.' };
    return go ? { go } : say('The study door is locked tight.');
  }

  function sentinelAsk(s, who) {
    if (flag(s, 'asked')) return say([who, 'YOU HAVE ASKED YOUR QUESTION. CHOOSE YOUR STAIR.']);
    return { choose: { id: 'ask_' + who, prompt: `What do you ask ${who === 'granite' ? 'Granite' : 'Basalt'}?`, options: [['safe', '"Which stair is safe?"'], ['other', '"If I asked the other sentinel which stair is safe, what would it say?"'], ['liar', '"Which of you is the liar?"'], ['none', 'Ask nothing for now']] } };
  }

  function climb(s, side) {
    if (side === s.flags.safe) return { say: ['You climb the ' + side + ' stair. It winds up and up around the spire, solid as the island itself.'], go: { to: 'ledge', x: 44, y: 172 } };
    return { die: 'You climb the ' + side + ' stair. Halfway up, the step under your foot crumbles to dust, and then the next, and then all of them.\n\nFrom below, faintly, you hear one of the sentinels laughing.' };
  }

  const leaveChoice = { id: 'leave', prompt: 'Leave the tower with Elowen, and the king still asleep?', options: [['go', 'Yes, it\'s over'], ['stay', 'No, not yet']] };

  const CHOICES = {
    ferry: (s, o) => o === 'stay' ? say(['nell', 'Suit yourself.'])
      : { say: ['The ferrywoman pushes off, and the mists swallow you up.'], go: ISLES[o] },
    leave: (s, o) => {
      if (o !== 'go') return say('You look back at the sleeping king.');
      s.won = 'short';
      return { say: ['You lead Elowen down the stair. Orla\'s guards cheer. Varrick\'s schemes are finished, and the princess is free.', 'But in the tower above, the old king sleeps on, and nobody knows how to wake him.'], win: 'short' };
    }
  };
  for (const who of ['granite', 'basalt']) {
    CHOICES['ask_' + who] = (s, o) => {
      if (o === 'none') return say('You decide to think about it some more.');
      set(s, 'asked');
      const liar = s.flags.liar === who, safe = s.flags.safe, unsafe = safe === 'left' ? 'right' : 'left', other = who === 'granite' ? 'BASALT' : 'GRANITE';
      if (o === 'safe') return say([who, `THE ${liar ? unsafe.toUpperCase() : safe.toUpperCase()} STAIR IS SAFE.`]);
      if (o === 'liar') return say([who, `${other} IS THE LIAR.`], 'Well, that was a waste of a question.');
      pts(s, 'sentq', 4);
      return say([who, `${other} WOULD SAY THE ${unsafe.toUpperCase()} STAIR.`], 'A clever question. Whichever one is lying, the answer points at the wrong stair.');
    };
  }


  // ---- things you can do with items in the bag ----
  const ITEM_ACTS = {
    ring: { hand: () => say('You polish the ring on your sleeve. The stag gleams. Very princely.'), talk: () => say(['rowan', 'Don\'t worry, Father. I haven\'t lost it.']) },
    bottle: { hand: () => say('You tug at the cork until your fingers ache. It\'s stuck fast. Someone with stronger teeth, maybe.'), talk: () => say('You shout into the bottle. It doesn\'t help.') },
    conch: { hand: () => say('You hold the conch to your ear. Under the hush of the sea, a voice whispers: "...the Oracle... bring me to the Oracle..."'), talk: () => say(['rowan', 'Hello?'], 'The conch hushes back at you. Somebody out there listens to shells.') },
    token: { hand: () => say('You flip the token. Boat side up. That seems like a sign.') },
    glowcap: { hand: () => say('It\'s soft and slightly warm. You resist the urge to eat it. Mostly.'), talk: () => say('The glowcap brightens a little, as if pleased to be noticed.') },
    whistle: { hand: () => ({ say: ['You play the three etched notes. They ring out sweetly, and somewhere far off, something seems to listen.'], sound: 'whistle' }), talk: () => say('You can\'t talk and whistle at the same time. Nobody can.') },
    oilcan: { hand: () => say('A drop of oil lands on your boot. Now your boot squeaks less. Your boot didn\'t squeak before.') },
    lantern: { hand: () => say('The ember is warm but never hot. You could hold it all day.'), talk: () => say('The ember crackles, which you choose to take as friendly.') },
    fish: { hand: () => say('It\'s slippery, silver and definitely a fish. Something hungry would love it.'), talk: () => say('The fish has no comment.') },
    compass: { hand: () => ({ map: true }), talk: () => say('The ink on the map ripples, as if waiting for you to choose.') },
    feather: { hand: () => say('The feather is warm as sunlight. Holding it, you feel like getting up early, which is a first.'), talk: () => say('It glows a little brighter. Dawn breaks spells cast in the dark, the stories say.') },
    mirror: { hand: () => say('You look into the mirror shell. You look terrible. Shipwrecks will do that.'), talk: () => say(['rowan', 'What is cast at you, send home.'], 'The mirror shell seems to hum.') },
    letter: { hand: () => say(ITEMS.letter.desc) },
    emptylantern: { hand: () => say('Cold, empty and brass. It wants fire.') },
    bun: { hand: () => say('It\'s sticky. You lick your fingers. You do not eat the bun. Willpower!'), talk: () => say('You promise the bun you\'ll find it a good home.') },
    thread: { hand: () => say('You tug it. It doesn\'t break. You tug harder. It still doesn\'t break. Your finger, on the other hand, is not happy.') },
    songsheet: { hand: () => say('You hum the lullaby under your breath, very quietly. Even that makes your eyelids heavy.'), talk: () => say('You\'d better save the singing for something with teeth.') },
    keys: { hand: () => say('A dozen keys. Pantry, armory, privy... and one black key with a silver bow. That one looks important.') },
    coin: { hand: () => say('You flip it. Skulls. Of course it\'s skulls.') },
    tabard: { hand: () => say('You smooth down the tabard. You look exactly like a servant. Your father would be horrified.') },
    prism: { hand: () => say('You tilt the prism. Rainbows skitter across everything. It\'s bright enough to make you see spots.') },
    rattler: { hand: () => say('You are NOT winding that thing in your own hands. Pim was very clear.'), talk: () => say('It ticks at you menacingly.') },
    stinkhorn: { hand: () => say('You sniff it, against your better judgment. Your better judgment was right.'), talk: () => say('Even talking near it makes your eyes water.') },
    pickle: { hand: () => say('You lick it. Just once. Your tongue goes numb and your ears ring. You decide to save the rest for someone you dislike.') },
    kelp: { hand: () => say('Cold. Slimy. Clammy. Holding it, your hand feels like it belongs to a fish.') }
  };
  const COMBOS = {
    'oilcan+ring': 'Now your ring is shiny AND slippery. That seems like a mistake.',
    'glowcap+lantern': 'The glowcap and the ember glow at each other. It\'s oddly sweet.',
    'feather+mirror': 'The feather\'s reflection glows twice as bright. Pretty, but it doesn\'t change anything.',
    'fish+lantern': 'You are not cooking the roc\'s lunch.',
    'bottle+oilcan': 'You oil the cork. It\'s still stuck, just slicker.',
    'conch+whistle': 'You whistle into the conch. It whistles back, sort of.',
    'bun+fish': 'Fish bun. No. Absolutely not.',
    'songsheet+whistle': 'The lullaby doesn\'t fit in three notes. Fennick would be appalled.',
    'emptylantern+glowcap': 'The glowcap won\'t fit in the lantern, and it\'s not true fire anyway.'
  };
  function invAct(s, id, verb, other) {
    if (!has(s, id)) return {};
    if (verb === 'look') return say(ITEMS[id].desc);
    if (verb === 'item') {
      if (!other || other === id) return say('You can\'t use something on itself.');
      const key = [id, other].sort().join('+');
      return say(COMBOS[key] || 'Those two don\'t go together.');
    }
    const h = ITEM_ACTS[id] && ITEM_ACTS[id][verb];
    return h ? h(s) : say(verb === 'talk' ? 'Talking to your belongings. It\'s been a long day.' : 'You turn it over in your hands. Nothing happens.');
  }

  // ---- hint book: a nudge, then the answer, for whatever comes next ----
  function hints(s) {
    const H = (q, nudge, answer) => ({ q, nudge, answer });
    const f = k => flag(s, k), h = i => has(s, i);
    if (!f('ring_taken') || !f('bottle_taken') || !f('conch_taken')) return H('What should I do on the beach?', 'Shipwrecks leave things behind. So does the tide.', 'Use the Hand on the wreckage, the bottle and the conch shell to pick them all up.');
    if (!f('traded')) return H('How do I get off this island?', 'Someone in the village buys what the sea brings, especially secrets.', 'Give the corked bottle to Old Bram in the curio shop. He\'ll give you a ferry token.');
    if (!f('got_bun')) return H('Is there anywhere else to visit in the village?', 'Every village has an inn.', 'Visit the Drowned Sailor in the square and talk to Marla. Talk to Fennick the bard too.');
    if (!f('paid')) return H('What is the ferry token for?', 'Ferries need paying.', 'Use the ferry token on the ferrywoman at the docks.');
    if (!f('got_whistle')) return H('What do I do on the Isle of Mists?', 'The conch keeps whispering about someone. Also: don\'t follow strange lights.', 'Go into the grotto and give the conch shell to the Oracle. Pick a glowcap on the shore while you\'re there.');
    if (!f('got_thread')) return H('Fennick needs spider silk. Where do I find it?', 'The Mistwood is west of the Isle of Mists shore. Spiders like light in a dark wood.', 'Give a glowcap from the Mists shore to Madame Weft in the Mistwood. Don\'t touch her or her web.');
    if (!f('strung')) return H('What do I do with the spider silk?', 'A bard with a broken string.', 'Give the spider silk to Fennick at the Drowned Sailor. He\'ll give you a song sheet.');
    if (!h('oilcan') && !f('clock')) return H('Why is everyone frozen on the Isle of Clocks?', 'One person in town is still moving. He keeps his own clocks.', 'Talk to Pim in his workshop. He\'ll give you an oil can.');
    if (!f('clock')) return H('How do I fix the clock?', 'The great gear is stuck.', 'Go into the clock tower and use the oil can on the great gear.');
    if (!f('got_lantern')) return H('The clock is running. Now what?', 'Pim will want to thank you.', 'Go back to Pim and talk to him.');
    if (h('emptylantern')) return H('What is the empty lantern for?', 'True fire comes from the Great Forge, through Pim\'s back door.', 'Go through Pim\'s back door to the Great Forge and use the empty lantern on the forge.');
    if (!f('got_fish')) return H('Is there anything else on the Isle of Clocks?', 'The town is moving again. Someone has fish to give away.', 'Talk to the fishmonger in the harbor. He\'ll give you a fish.');
    if (!f('lit')) return H('What is the forge lantern for?', 'Who has been asking for true fire?', 'Take the docks path south to the lighthouse and give the lantern to Hester. She\'ll give you the magic map.');
    if (f('compass') && !f('got_reply') && f('pts_aerie') && f('got_mirror') && !f('door_open')) {
      if (!f('got_glass') && !f('traded_glass')) return H('Is there a way to reach Elowen before the wedding?', 'Bram trades parchment for something pretty from the tide pools past the Coral Strand.', 'Pick up the sea glass at the tide pools, trade it to Bram for parchment, then ask Hester about getting a message into the castle.');
      if (has(s, 'seaglass')) return H('What is the sea glass for?', 'Bram loves pretty things from the sea.', 'Give the sea glass to Bram. He\'ll trade you parchment.');
      if (has(s, 'parchment')) return H('What do I write on the parchment?', 'Hester keeps a gull that knows the way to the princess\'s tower.', 'Talk to Hester at the lighthouse and ask about getting a message into the castle.');
      if (f('note_sent')) return H('Where is Elowen\'s answer?', 'Gulls hate being watched.', 'Visit another island, then come back up to the lighthouse.');
    }
    if (!f('pts_aerie')) {
      if (!f('pts_sentq') && s.room !== 'ledge') return H('How do I get past the sentinels?', 'Ask a question whose answer is a lie either way.', 'Ask either sentinel what the OTHER one would say. Then climb the opposite stair.');
      if (!f('goat')) return H('How do I get past the goat?', 'The goat has standards, and they involve pastry.', 'Give Marla\'s sweet bun to the goat.');
    }
    if (!f('fed')) return H('How do I deal with the roc?', 'Hungry babies make angry mothers.', 'Give the silver fish to the roc chick.');
    if (!h('feather') && !f('pts_feather')) return H('Now what at the aerie?', 'The mother roc approves of you now.', 'Use the Hand on the golden feathers in the nest.');
    if (f('compass') && wardensLeft(s)) {
      const need = { goggle: ['How do I get past Goggle, the sight warden?', 'Dazzle that great eye. Hester gave you something that throws light.', 'Use the lamp prism on Goggle.'], lugs: ['How do I get past Lugs, the hearing warden?', 'Something so loud it hurts. Pim made one by accident.', 'Take the "DO NOT WIND" rattler from Pim\'s workbench (after the clock runs), then use it on Lugs.'], snoot: ['How do I get past Snoot, the smell warden?', 'Overwhelm that nose. Something in the Mistwood stinks.', 'Pick the stinkhorn mushroom in the Mistwood and use it on Snoot.'], lick: ['How do I get past Lick, the taste warden?', 'Give him a taste he\'ll never forget. Marla keeps a dare on the bar.', 'Take a fire pickle from the jar at the Drowned Sailor and give it to Lick.'], grabby: ['How do I get past Grabby, the touch warden?', 'Warm hands mean land-folk. Find something cold and clammy.', 'Peel some cold kelp off the rocks on Sentinel Isle and use it on Grabby.'] };
      const w = WARDENS.find(x => !f('w_' + x.id)); return H(...need[w.id]);
    }
    if (!f('got_mirror')) return H('What do I do on the Coral Strand?', 'The guidebook says the mer-folk answer only to music.', 'Use the silver whistle on the lagoon. Then show Queen Nerissa your signet ring.');
    if (!f('door_open')) return H('How do I get into the castle?', 'The Oracle mentioned a door that opens to a song.', 'Use the silver whistle on the carved door at the Singing Cliffs. You\'ll need a light inside.');
    if (!f('got_keys')) return H('What should I do in the cellar?', 'The guard is asleep. His belt isn\'t guarded.', 'Use the Hand on the key ring at the sleeping guard\'s belt. Don\'t touch or talk to the guard himself.');
    if (!f('hound')) return H('How do I get past the hound?', 'Fennick said to sing it to anything with teeth.', 'Use the song sheet on the hound.');
    if (!f('letter_found')) return H('Where is the proof of Varrick\'s plot?', 'A steward keeps his secrets in his study. You have his guard\'s keys.', 'Use the key ring on the study door, go in, and use the Hand on the desk.');
    if (!h('tabard') && !f('pts_gallery')) return H('How do I get into the Great Hall?', 'The guards won\'t let a drowned rat through. Someone in the kitchen hates this wedding.', 'Show your signet ring to Bertha in the kitchen. She\'ll give you a servant\'s tabard.');
    if (!f('trust')) return H('Nobody believes me in the Great Hall!', 'Elowen saw you once, in a mirror. Remind her.', 'Show your signet ring to Elowen.');
    if (!f('unmasked')) return H('How do I stop the wedding?', 'The guard obeys its captain.', 'Give Varrick\'s letter to Captain Orla.');
    if (!f('beaten')) return H('How do I beat Varrick?', 'What is cast at you, send home.', 'Use the mirror shell on Varrick.');
    return H('How do I wake the king?', 'Dawn breaks spells cast in the dark.', 'Use the Feather of Dawn on the sleeping king.');
  }

  // ---- pathfinding: A* on a 4px grid inside the walk box, around blocked rects ----
  const CELL = 4;
  function freeAt(room, x, y) {
    const r = ROOMS[room], [x0, y0, x1, y1] = r.walk;
    if (x < x0 || x > x1 || y < y0 || y > y1) return false;
    return !(r.block || []).some(([bx, by, bw, bh]) => x >= bx && x < bx + bw && y >= by && y < by + bh);
  }
  function nearestFree(room, x, y) {
    const [x0, y0, x1, y1] = ROOMS[room].walk;
    x = Math.max(x0, Math.min(x1, x)); y = Math.max(y0, Math.min(y1, y));
    if (freeAt(room, x, y)) return [x, y];
    for (let d = CELL; d < 200; d += CELL) for (let a = 0; a < 16; a++) {
      const nx = x + Math.cos(a * Math.PI / 8) * d, ny = y + Math.sin(a * Math.PI / 8) * d;
      if (freeAt(room, nx, ny)) return [nx, ny];
    }
    return [x, y];
  }
  // Returns waypoints from (fx,fy) to the nearest free point to (tx,ty).
  function path(room, fx, fy, tx, ty) {
    [tx, ty] = nearestFree(room, tx, ty);
    if (!(ROOMS[room].block || []).length) return [[tx, ty]];
    const [x0, y0, x1, y1] = ROOMS[room].walk, W = Math.floor((x1 - x0) / CELL) + 1, Hh = Math.floor((y1 - y0) / CELL) + 1;
    const cell = (x, y) => [Math.round((x - x0) / CELL), Math.round((y - y0) / CELL)];
    const pt = (i, j) => [x0 + i * CELL, y0 + j * CELL];
    const ok = (i, j) => i >= 0 && j >= 0 && i < W && j < Hh && freeAt(room, ...pt(i, j));
    let [si, sj] = cell(fx, fy); const [ti, tj] = cell(tx, ty);
    if (!ok(si, sj)) { const n = nearestFree(room, fx, fy); [si, sj] = cell(n[0], n[1]); }
    const key = (i, j) => j * W + i, open = [[si, sj]], g = { [key(si, sj)]: 0 }, from = {}, closed = new Set();
    const hfn = (i, j) => Math.hypot(i - ti, j - tj);
    while (open.length) {
      let bi = 0; for (let k = 1; k < open.length; k++) if (g[key(...open[k])] + hfn(...open[k]) < g[key(...open[bi])] + hfn(...open[bi])) bi = k;
      const [ci, cj] = open.splice(bi, 1)[0], ck = key(ci, cj);
      if (ci === ti && cj === tj) {
        const out = [[tx, ty]]; let k = ck;
        while (from[k] !== undefined) { k = from[k]; const i = k % W, j = Math.floor(k / W); out.unshift(pt(i, j)); }
        return smooth(room, fx, fy, out);
      }
      closed.add(ck);
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        const ni = ci + di, nj = cj + dj, nk = key(ni, nj);
        if (!ok(ni, nj) || closed.has(nk)) continue;
        if (di && dj && (!ok(ci + di, cj) || !ok(ci, cj + dj))) continue; // no cutting corners
        const ng = g[ck] + Math.hypot(di, dj);
        if (g[nk] === undefined || ng < g[nk]) { if (g[nk] === undefined) open.push([ni, nj]); g[nk] = ng; from[nk] = ck; }
      }
    }
    return [[tx, ty]];
  }
  // Drop waypoints you can see past, so the walk looks natural.
  function smooth(room, fx, fy, pts) {
    const clear = (ax, ay, bx, by) => { const n = Math.ceil(Math.hypot(bx - ax, by - ay) / 2); for (let i = 1; i <= n; i++) if (!freeAt(room, ax + (bx - ax) * i / n, ay + (by - ay) * i / n)) return false; return true; };
    const out = []; let cx = fx, cy = fy, i = 0;
    while (i < pts.length) {
      let j = pts.length - 1;
      while (j > i && !clear(cx, cy, pts[j][0], pts[j][1])) j--;
      out.push(pts[j]); [cx, cy] = pts[j]; i = j + 1;
    }
    return out;
  }

  const DEFAULTS = {
    look: 'Nothing special about it.',
    hand: 'You can\'t do anything with that.',
    talk: 'It doesn\'t have much to say.',
    item: 'That doesn\'t do anything.'
  };

  const spotsIn = (s, room) => ROOMS[room].spots.filter(sp => !(sp.gone && sp.gone(s)));
  const findSpot = (s, id) => spotsIn(s, s.room).find(sp => sp.id === id);
  // Smallest spot under the point wins, so small objects beat big backgrounds.
  const hitSpot = (s, x, y) => {
    const hits = spotsIn(s, s.room).filter(sp => x >= sp.rect[0] && x < sp.rect[0] + sp.rect[2] && y >= sp.rect[1] && y < sp.rect[1] + sp.rect[3]);
    hits.sort((a, b) => a.rect[2] * a.rect[3] - b.rect[2] * b.rect[3]);
    return hits[0] || null;
  };

  // Apply a verb to a hotspot. Mutates s.
  function act(s, spotId, verb, item) {
    const sp = findSpot(s, spotId);
    if (!sp) return say(DEFAULTS[verb] || '');
    if (verb === 'item' && !has(s, item)) return say(DEFAULTS.item);
    if (verb === 'item' && item === 'compass') return { map: true };
    let r = null;
    const h = sp[verb];
    if (typeof h === 'function') r = h(s, item);
    if (!r && verb === 'walk' && sp.exit) r = { go: sp.exit };
    if (!r && verb === 'item') r = say(DEFAULTS.item);
    if (!r && verb !== 'walk') r = say(DEFAULTS[verb]);
    return r || {};
  }

  function choose(s, id, opt) {
    if (id.startsWith('talk_')) {
      const who = id.slice(5);
      if (opt === 'bye') return {};
      const topic = TALKS[who].topics(s).filter(Boolean).find(x => x[0] === opt);
      if (!topic) return {};
      let r = topic[2](s); if (Array.isArray(r)) r = { say: r };
      if (!r.go && !r.die && !r.win) r.choose = openTalk(s, who).choose;
      return r;
    }
    return CHOICES[id] ? CHOICES[id](s, opt) : {};
  }

  // The magic map works from any outdoor screen.
  function canSail(s) { return flag(s, 'compass') && !!ROOMS[s.room].outdoors; }
  function travel(s, isle) {
    if (!ISLES[isle]) return {};
    if (!canSail(s)) return say(flag(s, 'compass') ? 'The map\'s ink won\'t move indoors. It needs open sky.' : 'You don\'t have a map.');
    if (s.room === ISLES[isle].to) return say('You\'re already here.');
    return { say: ['You touch ' + ISLES[isle].name + ' on the magic map. The ink swirls like a whirlpool, the world tilts, and...'], go: ISLES[isle] };
  }

  function enter(s, go) {
    s.room = go.to; [s.x, s.y] = nearestFree(go.to, go.x, go.y);
    if (flag(s, 'note_sent') && ROOMS[go.to].isle !== 'crown') set(s, 'note_away');
    set(s, 'visited_' + ROOMS[go.to].isle);
    const e = ROOMS[go.to].enter;
    return e ? e(s) : null;
  }

  const api = { MAX_SCORE, ITEMS, ROOMS, ISLES, newState, act, choose, travel, canSail, enter, hitSpot, findSpot, spotsIn, has, invAct, hints, path, freeAt };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Game = api;
})(this);
