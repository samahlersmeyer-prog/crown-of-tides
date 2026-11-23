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
    lantern: { name: 'Forge lantern', desc: 'A brass lantern holding a living ember from the Clockmakers\' forge. It never goes out and it never burns your fingers.' },
    fish: { name: 'Silver fish', desc: 'A plump silver fish, wrapped in paper. It smells exactly like a fish.' },
    compass: { name: 'Tide chart', desc: 'Hester\'s sea chart of the Tidewater Isles, with a compass needle set into the corner that always points the way home. With it, you can sail to any island.' },
    feather: { name: 'Feather of Dawn', desc: 'A long golden feather from the roc of the Sentinel Isle. It glows like the first minute of morning. Old stories say dawn breaks any spell cast in the dark.' },
    mirror: { name: 'Mirror shell', desc: 'A shell polished to a perfect mirror by the mer-queen Nerissa. "What is cast at you," she said, "send home."' },
    letter: { name: "Varrick's letter", desc: 'A letter in the Steward\'s own hand: "The old king sleeps in the tower and will not wake. The true will is ash. My copy names me regent and Elowen\'s husband. The scribe has been paid. Burn this." He did not burn it.' }
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
  const once = (s, f, lines) => flag(s, f) ? null : (set(s, f), lines);

  // Boats: before the chart the ferry only knows two routes; after it, the chart opens the map.
  const boatFrom = home => s => flag(s, 'compass') ? { map: true }
    : home === 'docks' ? (flag(s, 'paid') ? { choose: ferryChoice } : say(['nell', 'Oi! Token first!']))
      : { say: ['You climb back aboard and the ferry carries you to Saltmarrow.'], go: { to: 'docks', x: 180, y: 170 } };
  const ferryChoice = { id: 'ferry', prompt: '"Where to?" asks the ferrywoman.', options: [['mists', 'The Isle of Mists'], ['clocks', 'The Isle of Clocks'], ['stay', 'Nowhere yet']] };

  const ROOMS = {
    // ================= ISLE OF THE CROWN =================
    beach: {
      name: 'Shipwreck Beach', isle: 'crown', scale: [140, 0.82, 194, 1.05],
      walk: [12, 142, 308, 194],
      enter: s => once(s, 'seen_beach', [
        'Salt water. Sand in places sand should never be. You are alive, which is more than can be said for your ship.',
        'Somewhere beyond these dunes is Elowen\'s castle. Time to find out whether she was worth a shipwreck.'
      ]),
      spots: [
        { id: 'west', name: 'path to the cliffs', rect: [0, 120, 14, 80], at: [14, 168], exit: { to: 'cliffs', x: 290, y: 168 } },
        { id: 'east', name: 'path to the village', rect: [306, 120, 14, 80], at: [306, 170], exit: { to: 'square', x: 26, y: 172 } },
        {
          id: 'wreck', name: 'wreckage', rect: [18, 88, 100, 62], at: [96, 152],
          look: s => say(flag(s, 'ring_taken')
            ? 'What\'s left of the Gallant Stag. You\'ll miss her. You\'ve already taken anything worth taking.'
            : 'What\'s left of the Gallant Stag. Among the splintered planks, something gold catches the light.'),
          hand: s => {
            if (flag(s, 'ring_taken')) return say('Nothing else in the wreck but splinters and regret.');
            set(s, 'ring_taken'); gain(s, 'ring'); pts(s, 'ring', 5);
            return say('You dig through the splinters and find your signet ring, still on its chain. Your father would have been furious if you\'d lost it.');
          }
        },
        {
          id: 'bottle', name: 'bottle', rect: [190, 156, 20, 16], at: [196, 176], gone: s => flag(s, 'bottle_taken'),
          look: () => say('A green glass bottle, half buried in the sand. There\'s a note inside.'),
          hand: s => { set(s, 'bottle_taken'); gain(s, 'bottle'); pts(s, 'bottle', 5); return say('You pull the bottle out of the sand. The cork won\'t budge, but the note inside looks old.'); }
        },
        {
          id: 'conch', name: 'conch shell', rect: [250, 172, 22, 16], at: [256, 186], gone: s => flag(s, 'conch_taken'),
          look: () => say('A large pink conch shell, bigger than your hand.'),
          hand: s => { set(s, 'conch_taken'); gain(s, 'conch'); pts(s, 'conch', 5); return say('You pick up the conch. When you hold it near your ear you could swear the sea is whispering a name.'); }
        },
        { id: 'sea', name: 'sea', rect: [0, 70, 320, 44], look: () => say('The sea that ate your ship looks perfectly innocent now. Typical.'), hand: () => say('You\'ve had quite enough of the sea for one day.') }
      ]
    },

    cliffs: {
      name: 'The Singing Cliffs', isle: 'crown', scale: [146, 0.85, 192, 1.02],
      walk: [70, 146, 306, 192],
      spots: [
        { id: 'east', name: 'path to the beach', rect: [306, 120, 14, 80], at: [306, 168], exit: { to: 'beach', x: 24, y: 168 } },
        {
          id: 'door', name: 'carved door', rect: [196, 62, 58, 82], at: [225, 150],
          look: s => say(flag(s, 'door_open')
            ? 'The stone door stands open. A cold draft breathes out of the dark.'
            : 'A doorway carved into the cliff, framed by a ring of carved musical notes. In the middle is a small round hole, about the size of a whistle\'s mouth.'),
          hand: s => flag(s, 'door_open') ? say('It\'s already open.') : say('You push. You pull. The door has clearly been a cliff for a very long time and intends to stay one.'),
          talk: s => flag(s, 'door_open') ? say('The darkness does not answer.') : say(['rowan', 'Open sesame?'], 'Nothing. Worth a try.'),
          item: (s, i) => {
            if (i !== 'whistle') return null;
            if (flag(s, 'door_open')) return say('The door is already open.');
            set(s, 'door_open'); pts(s, 'door', 10);
            return say('You put the silver whistle to your lips and play the three etched notes. The carved notes on the rock glow one by one, and with a deep grinding sound the door rolls aside.');
          },
          walk: s => {
            if (!flag(s, 'door_open')) return null;
            if (!has(s, 'glowcap') && !has(s, 'lantern')) return { die: 'You step into the pitch-black tunnel. Three steps in, the floor stops. You don\'t.\n\nNext time, maybe bring a light.' };
            return { go: { to: 'tunnel', x: 30, y: 172 } };
          }
        },
        {
          id: 'edge', name: 'cliff edge', rect: [0, 100, 66, 100],
          look: () => say('A sheer drop to the rocks and surf far below. Gulls wheel beneath you. Beneath you!'),
          hand: () => ({ die: 'You decide to climb down the cliff for a better look.\n\nYou get a much better look, very quickly.' }),
          walk: () => say('You get as close to the edge as your stomach allows, which isn\'t very close.')
        },
        { id: 'sea', name: 'sea', rect: [0, 60, 190, 40], look: () => say('The Tidewater Isles dot the horizon: one wrapped in purple mist, one bristling with tiny towers, one a single great spire of rock.') }
      ]
    },

    square: {
      name: 'Saltmarrow Village', isle: 'crown', scale: [150, 0.88, 194, 1.04],
      walk: [12, 150, 244, 194],
      enter: s => once(s, 'seen_square', ['The village of Saltmarrow huddles under the castle walls. Bunting hangs everywhere, but nobody looks very festive.']),
      spots: [
        { id: 'west', name: 'path to the beach', rect: [0, 140, 12, 60], at: [12, 172], exit: { to: 'beach', x: 294, y: 170 } },
        { id: 'south', name: 'road to the docks', rect: [100, 194, 120, 6], at: [160, 192], exit: { to: 'docks', x: 30, y: 168 } },
        { id: 'shop', name: 'curio shop', rect: [18, 86, 34, 54], at: [36, 152], exit: { to: 'shop', x: 40, y: 178 },
          look: () => say('A crooked little shop. The sign reads "BRAM\'S CURIOS — Treasures of the Tide."') },
        {
          id: 'board', name: 'notice board', rect: [64, 98, 30, 30], at: [80, 152],
          look: s => { pts(s, 'board', 2); return say('A freshly nailed decree: "BY ORDER OF THE GRAND STEWARD. Princess Elowen will wed Grand Steward Varrick at sundown. All rejoice. Rejoicing is mandatory."', 'Below it, an older notice, half torn: "...the King\'s sudden illness... no visitors..."'); },
          hand: () => say('Tearing down royal decrees is the sort of thing that gets you noticed by guards.')
        },
        {
          id: 'fountain', name: 'fountain', rect: [124, 112, 72, 40], at: [160, 156],
          look: () => say('A fountain of a leaping dolphin. Its basin is full of coins tossed in for luck.'),
          hand: () => ({ die: 'You scoop a handful of coins from the fountain. The guards at the gate are on you in seconds.\n\n"Robbing the Wishing Fountain on the princess\'s wedding day? The Steward will love this."\n\nYou spend the rest of your life in the Steward\'s dungeon, wishing.' })
        },
        {
          id: 'guards', name: 'castle guards', rect: [248, 92, 72, 70], at: [236, 168],
          look: () => say('Two guards in sea-green armor stand at the castle gate, looking as bored as only gate guards can.'),
          talk: () => say(['guard', 'By order of the Grand Steward, nobody enters the castle until after the wedding. Move along.']),
          hand: () => say('The guards have spears. You have hands. You decide against it.'),
          item: (s, i) => {
            if (i === 'ring') return say(['guard', 'A Thornmere signet? Lad, rings wash up on this beach every week. Move along.'], 'They don\'t even look at it properly.');
            if (i === 'letter') return say(['guard', 'Letters go through the Steward\'s office.'], 'Handing proof of the Steward\'s treachery to the Steward\'s office seems unwise.');
            return say(['guard', 'Not interested.']);
          }
        },
        { id: 'castle', name: 'castle', rect: [200, 0, 120, 90], look: () => say('Tidewater Castle rises above the village, all white towers and sea-green banners. The tallest tower has no windows lit at all.') }
      ]
    },

    shop: {
      name: "Bram's Curios", isle: 'crown',
      walk: [20, 162, 300, 194],
      enter: s => once(s, 'seen_shop', ['The shop is crammed with nets, shells, ship\'s wheels and a stuffed fish that seems to be judging you. An old man peers over the counter.']),
      spots: [
        { id: 'door', name: 'door', rect: [8, 76, 40, 84], at: [36, 176], exit: { to: 'square', x: 36, y: 156 } },
        {
          id: 'bram', name: 'Old Bram', rect: [196, 72, 36, 52], at: [214, 168],
          look: () => say('Old Bram has a beard like a sea-sponge and the squint of a man who has been appraising junk for sixty years.'),
          talk: s => flag(s, 'traded')
            ? say(['bram', 'Safe travels, lad. Mind the mists out there, and don\'t follow any lights! And if you ever see Hester at the lighthouse, tell her she still owes me a kettle.'])
            : say(['bram', 'Welcome, welcome! Bram buys what the sea brings. Messages in bottles most of all. Nothing like a stranger\'s secrets, eh?'], ['bram', 'I\'ve a spare ferry token for anyone who brings me a good one.']),
          hand: () => say('Bram is not for sale.'),
          item: (s, i) => {
            if (i === 'bottle') {
              lose(s, 'bottle'); gain(s, 'token'); set(s, 'traded'); pts(s, 'token', 10);
              return say('Bram\'s eyes light up. He works the cork out with his teeth and reads the note aloud.', ['bram', '"Dear Mum, the voyage is going fine, no need to worry. P.S. Please feed my goat." Beautiful!'], ['bram', 'Here, lad, a ferry token as promised. The ferrywoman at the docks will take you out to the near isles.']);
            }
            if (i === 'conch') return say(['bram', 'Pretty, but I\'ve got a hundred of those. Now, the Oracle out on the Isle of Mists, she listens to shells. Says the sea tells her things.']);
            if (i === 'ring') return say(['bram', 'Keep that, lad. A crest like that might open doors someday. Or at least one door.']);
            if (i === 'fish') return say(['bram', 'I deal in treasures, not lunch.']);
            return say(['bram', 'Not much call for that, I\'m afraid.']);
          }
        },
        { id: 'book', name: 'guidebook', rect: [176, 106, 18, 10], look: () => say('A battered pamphlet on the counter: "A TRAVELLER\'S GUIDE TO THE TIDEWATER ISLES."', '"The Isle of Mists: home of the Oracle. Do not follow the lights. The Isle of Clocks: home of the Clockmakers, whose forge-fire never dies. Sentinel Isle: two stone guardians, one of whom always lies. The Coral Strand: where the mer-folk answer only to music."'), hand: () => say(['bram', 'That\'s the shop copy. Read, don\'t take.']) },
        { id: 'shelf', name: 'shelves', rect: [60, 30, 120, 70], look: () => say('Ship in a bottle. Shrunken coconut. A mermaid\'s comb, price on request. A sign: "YOU BREAK IT, YOU SWIM FOR IT."'), hand: () => say('Bram clears his throat meaningfully.') },
        { id: 'fish', name: 'stuffed fish', rect: [250, 30, 50, 24], look: () => say('It stares at you with glassy disapproval. You stare back. You lose.') }
      ]
    },

    docks: {
      name: 'Saltmarrow Docks', isle: 'crown', scale: [150, 0.86, 192, 1.03],
      walk: [14, 150, 196, 192],
      spots: [
        { id: 'west', name: 'road to the village', rect: [0, 140, 14, 60], at: [14, 168], exit: { to: 'square', x: 160, y: 186 } },
        { id: 'shore', name: 'path to the lighthouse', rect: [0, 194, 200, 6], at: [100, 192], exit: { to: 'lighthouse', x: 40, y: 176 } },
        {
          id: 'nell', name: 'ferrywoman', rect: [168, 116, 26, 50], at: [160, 170],
          look: () => say('A weathered ferrywoman in an oilskin coat, chewing on an unlit pipe.'),
          talk: s => flag(s, 'paid') ? say(['nell', 'Hop in whenever you\'re ready. Mists or Clocks, I\'ll run you back and forth. Nothing else to do on a wedding day.'], ['nell', 'The far isles? Not without a proper chart, and only Hester has one of those.'])
            : say(['nell', 'Ferry to the near isles. One token. No token, no boat. No exceptions, not even for handsome shipwrecked fellows.']),
          item: (s, i) => {
            if (i === 'token') { lose(s, 'token'); set(s, 'paid'); pts(s, 'paid', 5); return say('She bites the token, nods, and pockets it.', ['nell', 'That buys you as many trips as you like today. Climb aboard when you\'re ready.']); }
            if (i === 'ring') return say(['nell', 'Pretty. Not a token.']);
            return say(['nell', 'Don\'t want it.']);
          }
        },
        { id: 'boat', name: 'ferry boat', rect: [200, 130, 114, 44], at: [190, 168], look: () => say('A sturdy little ferry with a patched sail.'), hand: boatFrom('docks'), walk: boatFrom('docks') },
        { id: 'sea', name: 'sea', rect: [0, 60, 320, 60], look: () => say('Islands scattered to the horizon. Off to the south, a lighthouse stands dark against the sky.') }
      ]
    },

    lighthouse: {
      name: 'The Lighthouse', isle: 'crown',
      walk: [20, 150, 300, 194],
      enter: s => once(s, 'seen_lh', ['You climb a hundred and twelve steps. You count them, twice, out of spite. At the top is the great lamp, cold and dark, and a woman with a telescope.']),
      spots: [
        { id: 'down', name: 'stairs down', rect: [0, 120, 18, 80], at: [20, 176], exit: { to: 'docks', x: 100, y: 186 } },
        {
          id: 'hester', name: 'Hester', rect: [206, 104, 28, 58], at: [196, 172],
          look: () => say('Hester the lighthouse keeper: brass buttons, a wind-burned face, and a scowl aimed at the dark lamp.'),
          talk: s => flag(s, 'lit')
            ? say(['hester', 'Keep that chart dry, lad. The needle always points home, wherever home turns out to be.'])
            : say(['hester', 'Six weeks ago the Steward ordered my light put out. Said it "confused the fish." Since then, three ships have hit the rocks.'], ['hester', 'Yours makes four, by the look of you.'], ['hester', 'And the flame won\'t catch from any common fire now. It needs true fire, from the Clockmakers\' forge. Bring me that and I\'ll give you anything I own.']),
          hand: () => say('Hester gives you a look that could relight the lamp on its own.'),
          item: (s, i) => i === 'lantern' ? lightLamp(s) : i === 'ring' ? say(['hester', 'Thornmere! So you\'re the prince from the wreck. Shame about your ship. Shame about my light.']) : say(['hester', 'What would I want with that?'])
        },
        {
          id: 'lamp', name: 'great lamp', rect: [128, 36, 64, 86], at: [160, 160],
          look: s => say(flag(s, 'lit') ? 'The great lamp blazes, throwing its beam across the sea.' : 'A huge glass lens around an empty wick. Cold as a fish.'),
          hand: () => say('You poke the wick. It remains a wick.'),
          item: (s, i) => i === 'lantern' ? lightLamp(s) : i === 'glowcap' ? say('The glowcap gives a cosy green glow. Ships would think the lighthouse had a cold.') : null
        },
        { id: 'window', name: 'window', rect: [240, 30, 70, 50], look: () => say('Through the window: the whole archipelago, laid out like a map.') }
      ]
    },

    // ================= ISLE OF MISTS =================
    mistshore: {
      name: 'Isle of Mists', isle: 'mists', scale: [146, 0.85, 194, 1.04],
      walk: [12, 146, 300, 194],
      enter: s => once(s, 'seen_mist', ['The mist is so thick you could spread it on bread. Strange lights drift between the trees.']),
      spots: [
        { id: 'boat', name: 'ferry boat', rect: [232, 168, 88, 32], at: [222, 180], look: () => say('The ferry bobs at the shore. The ferrywoman is pretending not to be nervous.'), hand: boatFrom('mists'), walk: boatFrom('mists') },
        { id: 'cave', name: 'grotto', rect: [128, 66, 64, 70], at: [160, 150], exit: { to: 'oracle', x: 160, y: 188 }, look: () => say('A grotto mouth, its stones carved with eyes. Very welcoming.') },
        {
          id: 'glowcaps', name: 'glowing mushrooms', rect: [36, 158, 48, 26], at: [62, 180],
          look: s => say(has(s, 'glowcap') ? 'Glowcaps. You\'ve already picked one; that\'s plenty.' : 'A clump of mushrooms glowing a soft green. Handy in the dark.'),
          hand: s => { if (has(s, 'glowcap')) return say('One glowcap is plenty. Leave some for the fairies.'); gain(s, 'glowcap'); pts(s, 'glowcap', 5); return say('You pick a plump glowcap. It keeps glowing in your hand.'); }
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
      walk: [30, 152, 290, 194],
      spots: [
        { id: 'out', name: 'way out', rect: [0, 194, 320, 6], at: [160, 192], exit: { to: 'mistshore', x: 160, y: 154 } },
        {
          id: 'sibyl', name: 'Oracle', rect: [140, 70, 40, 66], at: [160, 160],
          look: () => say('An old woman sits cross-legged beside a glowing pool, her eyes milky white. She is looking right at you anyway.'),
          talk: s => {
            if (flag(s, 'got_whistle')) return say(['oracle', 'The cliffs will sing for you now, Prince. Gather what you need: true fire for the dark, dawn for the sleeper, a mirror for the sorcerer. The sun does not wait.']);
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
              lose(s, 'conch'); gain(s, 'whistle'); set(s, 'got_whistle'); pts(s, 'whistle', 10);
              return say('The Oracle holds the conch to her ear and smiles.', ['oracle', 'Ah. The sea has been worried about you.'], 'She hands you a slender silver whistle.', ['oracle', 'Play its three notes at the Singing Cliffs. The mer-folk know the tune too.']);
            }
            if (i === 'ring') return say(['oracle', 'I know who you are, child. It is the princess who must see that.']);
            if (i === 'letter') return say(['oracle', 'Do not show it to me. Show it to someone who can arrest a Steward.']);
            return say(['oracle', 'That is not the voice of the sea.']);
          }
        },
        { id: 'pool', name: 'glowing pool', rect: [100, 136, 120, 18], look: () => say('In the pool you see a castle hall, a veiled bride, and a man in black smiling too widely. Behind them, a king asleep in a tower. The sun outside is low.'), hand: () => say('The water is ice cold. The vision shivers and fades, then returns.') }
      ]
    },

    // ================= ISLE OF CLOCKS =================
    clockharbor: {
      name: 'Isle of Clocks', isle: 'clocks', scale: [150, 0.86, 194, 1.03],
      walk: [14, 150, 240, 194],
      enter: s => { pts(s, 'clocks', 3); return once(s, 'seen_clocks', ['A town of brass and copper, all gears and chimneys. Everyone in it is frozen in place: a baker mid-knead, a fishmonger mid-shout. Above it all, the great tower clock reads one minute to noon. It has, you suspect, for some time.']); },
      spots: [
        { id: 'boat', name: 'ferry boat', rect: [244, 160, 76, 40], at: [236, 178], look: () => say('Your boat, waiting in the harbor.'), hand: boatFrom('clocks'), walk: boatFrom('clocks') },
        { id: 'tower', name: 'clock tower', rect: [120, 80, 40, 62], at: [140, 154], exit: { to: 'clocktower', x: 160, y: 188 }, look: s => say(flag(s, 'clock') ? 'The great clock ticks happily along.' : 'The tower door stands ajar. The great clock above it is stuck at one minute to noon.') },
        { id: 'clockface', name: 'clock face', rect: [118, 14, 44, 44], look: s => say(flag(s, 'clock') ? 'Tick, tock. Time is moving again.' : 'Eleven fifty-nine. Forever, apparently.') },
        { id: 'workshop', name: 'workshop', rect: [30, 96, 34, 46], at: [48, 154], exit: { to: 'workshop', x: 40, y: 178 }, look: () => say('A round door with a sign: "PIM — TINKER — KNOCK LOUDLY, I AM USUALLY UNDER SOMETHING."') },
        {
          id: 'fishmonger', name: 'fishmonger', rect: [190, 104, 28, 52], at: [200, 166],
          look: s => say(flag(s, 'clock') ? 'A cheerful fishmonger, back in business.' : 'A fishmonger, frozen mid-shout, holding up a silver fish.'),
          talk: s => {
            if (!flag(s, 'clock')) return say('He doesn\'t answer. He is very, very still.');
            if (has(s, 'fish') || flag(s, 'got_fish')) return say(['fishmonger', 'Enjoy the fish, hero!']);
            set(s, 'got_fish'); gain(s, 'fish'); pts(s, 'fish', 3);
            return say(['fishmonger', '...FRESH FISH! Oh! Was I stuck? You fixed the clock? Here, lad, take the best one. On the house!'], 'He hands you a plump silver fish.');
          },
          hand: s => say(flag(s, 'clock') ? 'Better to ask than grab.' : 'Taking a fish from a frozen man feels like stealing. Because it is.')
        },
        { id: 'folk', name: 'frozen townsfolk', rect: [80, 110, 24, 44], look: s => say(flag(s, 'clock') ? 'The baker is kneading dough as if nothing happened.' : 'A baker, frozen mid-knead. Flour hangs in the air around her like snow that forgot to fall.') }
      ]
    },

    workshop: {
      name: "Pim's Workshop", isle: 'clocks',
      walk: [20, 160, 300, 194],
      spots: [
        { id: 'door', name: 'door', rect: [8, 80, 40, 84], at: [36, 176], exit: { to: 'clockharbor', x: 48, y: 158 } },
        {
          id: 'pim', name: 'Pim', rect: [188, 128, 26, 40], at: [180, 176],
          look: () => say('Pim the tinker: a gnome in goggles, two feet tall and nine-tenths beard.'),
          talk: s => {
            if (flag(s, 'clock') && !flag(s, 'got_lantern')) {
              set(s, 'got_lantern'); gain(s, 'lantern'); pts(s, 'lantern', 5);
              return say(['pim', 'You did it! I heard the tower start up. Everyone\'s moving again!'], ['pim', 'You\'ll want a reward. Here: a lantern with a living ember from the forge. It never goes out. Very good for dark tunnels. Also for lighting lighthouses, if you know any lighthouse keepers.']);
            }
            if (flag(s, 'got_lantern')) return say(['pim', 'Off you go, off you go! I\'ve got forty-one clocks to reset.']);
            if (has(s, 'oilcan')) return say(['pim', 'The great gear, at the top of the tower! Oil it, and mind your fingers once it starts moving!']);
            gain(s, 'oilcan'); pts(s, 'oilcan', 5);
            return say(['pim', 'A visitor! A moving one! Most people stopped moving when the tower did.'], ['pim', 'The Steward\'s men came and poured sand in the great gear, and everything stopped. Everything except me. I keep my own clocks.'], ['pim', 'My knees won\'t manage the tower stairs. Take this oil can and oil the great gear for me, would you?']);
          },
          hand: () => say(['pim', 'Hands off the beard!']),
          item: (s, i) => i === 'ring' ? say(['pim', 'Lovely engraving. Shoddy clasp, though. I could fix that.']) : say(['pim', 'Fascinating. No.'])
        },
        { id: 'bench', name: 'workbench', rect: [60, 100, 100, 40], look: () => say('A clockwork bird with no head. A teapot with legs. Something labelled "DO NOT WIND."'), hand: () => say(['pim', 'Don\'t touch that! Or that! Especially not that!']) }
      ]
    },

    clocktower: {
      name: 'Inside the Clock Tower', isle: 'clocks',
      walk: [20, 160, 300, 194],
      spots: [
        { id: 'out', name: 'way out', rect: [0, 194, 320, 6], at: [160, 192], exit: { to: 'clockharbor', x: 140, y: 158 } },
        {
          id: 'gear', name: 'great gear', rect: [110, 40, 100, 100], at: [160, 166],
          look: s => say(flag(s, 'clock') ? 'The great gear turns smoothly, teeth whirling past. Probably best not to touch it.' : 'An enormous brass gear, gritty with sand and seized solid.'),
          hand: s => flag(s, 'clock') ? { die: 'You reach out to touch the turning gear.\n\nThe gear reaches back.\n\nThe Isle of Clocks will be hearing about this for years.' } : say('You heave at it. It does not heave back.'),
          item: (s, i) => {
            if (i !== 'oilcan') return null;
            if (flag(s, 'clock')) return say('It\'s running beautifully already.');
            set(s, 'clock'); lose(s, 'oilcan'); pts(s, 'clock', 15);
            return say('You oil every tooth of the great gear. Sand grinds, metal groans, and then, with a CLUNK you feel in your boots, the gear begins to turn.', 'Far above, the great clock strikes noon. Twelve booming notes roll across the island, and outside, the whole town starts moving again.');
          }
        },
        { id: 'gears', name: 'gears', rect: [230, 30, 80, 70], look: () => say('Gears driving gears driving gears. Somewhere in here, presumably, is the reason for all of it.') },
        { id: 'pendulum', name: 'pendulum', rect: [30, 30, 40, 120], look: s => say(flag(s, 'clock') ? 'The pendulum swings, steady as a heartbeat.' : 'A huge pendulum, hanging motionless.') }
      ]
    },

    // ================= SENTINEL ISLE =================
    sentbase: {
      name: 'Sentinel Isle', isle: 'sentinels', scale: [156, 0.86, 194, 1.03],
      walk: [14, 156, 306, 194],
      enter: s => { delete s.flags.asked; return once(s, 'seen_sent', ['A single great spire of rock rises from the sea. Two stairways are cut into it, side by side, and at the foot of each stands a stone sentinel.', 'A plaque reads: "ONE OF US SPEAKS ONLY TRUTH. ONE OF US ONLY LIES. ONE STAIR IS SAFE. YOU MAY ASK ONE QUESTION."']); },
      spots: [
        { id: 'boat', name: 'boat', rect: [0, 176, 40, 24], at: [20, 184], look: () => say('Your boat, waiting at the rocks.'), hand: boatFrom('sentinels'), walk: boatFrom('sentinels') },
        { id: 'granite', name: 'Granite, the left sentinel', rect: [40, 60, 50, 96], at: [66, 166], look: () => say('A sentinel of grey granite with a stern stone face. It guards the left stair.'), talk: s => sentinelAsk(s, 'granite'), hand: () => say('It\'s rock. You\'re not.') },
        { id: 'basalt', name: 'Basalt, the right sentinel', rect: [230, 60, 50, 96], at: [254, 166], look: () => say('A sentinel of black basalt with a sly stone smile. It guards the right stair.'), talk: s => sentinelAsk(s, 'basalt'), hand: () => say('It\'s rock. You\'re not.') },
        { id: 'left', name: 'left stair', rect: [100, 40, 40, 116], at: [120, 160], look: () => say('A stair cut into the rock, winding up to the left.'), walk: s => climb(s, 'left'), hand: s => climb(s, 'left') },
        { id: 'right', name: 'right stair', rect: [180, 40, 40, 116], at: [200, 160], look: () => say('A stair cut into the rock, winding up to the right.'), walk: s => climb(s, 'right'), hand: s => climb(s, 'right') },
        { id: 'plaque', name: 'plaque', rect: [146, 130, 28, 16], at: [160, 160], look: () => say('"ONE OF US SPEAKS ONLY TRUTH. ONE OF US ONLY LIES. ONE STAIR IS SAFE. YOU MAY ASK ONE QUESTION."') }
      ]
    },

    aerie: {
      name: "The Roc's Aerie", isle: 'sentinels', scale: [150, 0.85, 194, 1.03],
      walk: [20, 150, 300, 194],
      enter: s => { pts(s, 'aerie', 10); return once(s, 'seen_aerie', ['You reach the summit, wind howling. A nest the size of a cottage sits on the peak, and in it a fluffy chick as tall as you are, screeching for food.', 'High above, a vast golden bird circles. Its mother, presumably. She has noticed you.']); },
      spots: [
        { id: 'down', name: 'stairs down', rect: [0, 120, 18, 80], at: [20, 172], exit: { to: 'sentbase', x: 110, y: 170 } },
        { id: 'nest', name: 'nest', rect: [150, 110, 130, 50], look: () => say('Woven from whole trees. Bones, shells, and a few golden feathers are tangled in it.') },
        {
          id: 'chick', name: 'roc chick', rect: [196, 90, 34, 34], at: [180, 170],
          look: s => say(flag(s, 'fed') ? 'The chick is full and drowsy, a happy ball of fluff.' : 'The chick is enormous, fluffy, and very, very hungry. It eyes you as though you might be lunch.'),
          talk: () => say('"PEEP," says the chick, at a volume that rattles your teeth.'),
          hand: s => flag(s, 'fed') ? say('You pat the chick. It purrs, which you didn\'t know birds could do.') : { die: 'You reach out to pat the chick.\n\nThe chick decides you are food.\n\nIn fairness, you did walk right up to its plate.' },
          item: (s, i) => {
            if (i !== 'fish') return say('The chick sniffs it and screeches louder.');
            lose(s, 'fish'); set(s, 'fed'); pts(s, 'feed', 5);
            return say('You toss the fish. The chick snaps it out of the air and swallows it whole, then gives a contented burp.', 'With a rush of wind, the mother roc lands on the rocks beside the nest. She studies you with an eye the size of a cartwheel, then dips her head.');
          }
        },
        {
          id: 'feathers', name: 'golden feathers', rect: [252, 126, 28, 18], at: [250, 170], gone: s => has(s, 'feather'),
          look: () => say('Golden feathers tangled in the nest, glowing faintly like morning light.'),
          hand: s => {
            if (!flag(s, 'fed')) return { die: 'You reach for a golden feather. The chick shrieks, "THIEF!" in bird.\n\nThe mother roc drops out of the sky like a thunderbolt and carries you off to a much smaller island, which is mostly beak.' };
            gain(s, 'feather'); pts(s, 'feather', 10);
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
      name: 'The Coral Strand', isle: 'reef', scale: [150, 0.86, 194, 1.03],
      walk: [14, 150, 240, 194],
      enter: s => once(s, 'seen_reef', ['A beach of pink coral sand. Rocks curl out into a turquoise lagoon. It is beautiful, and completely deserted.']),
      spots: [
        { id: 'boat', name: 'boat', rect: [250, 160, 70, 40], at: [236, 178], look: () => say('Your boat, waiting in the shallows.'), hand: boatFrom('reef'), walk: boatFrom('reef') },
        {
          id: 'lagoon', name: 'lagoon', rect: [0, 60, 320, 60], at: [120, 156],
          look: s => say(flag(s, 'summoned') ? 'The lagoon glitters around the mer-queen\'s rock.' : 'Clear turquoise water. Far below, you think you see towers made of coral.'),
          talk: s => flag(s, 'summoned') ? null : say(['rowan', 'Hello?'], 'The lagoon is unmoved. The guidebook said the mer-folk answer only to music.'),
          item: (s, i) => {
            if (i !== 'whistle') return null;
            if (flag(s, 'summoned')) return say('Nerissa is already here.');
            set(s, 'summoned'); pts(s, 'summon', 5);
            return say('You play the three notes across the water. The lagoon goes still, then bubbles, and a woman with a crown of coral and a long silver tail rises and settles onto the rock.', ['nerissa', 'That song has not been played in a hundred years. Who are you, to know it?']);
          }
        },
        {
          id: 'nerissa', name: 'Queen Nerissa', rect: [150, 84, 50, 46], at: [170, 158], gone: s => !flag(s, 'summoned'),
          look: () => say('Nerissa, queen of the mer-folk. Her eyes are the deep green of the sea far from land.'),
          talk: s => flag(s, 'got_mirror') ? say(['nerissa', 'Go. What is cast at you, send home.'])
            : say(['nerissa', 'The Steward stole my black pearl, the heart of the sea\'s magic. With it he put the king to sleep and bent the princess to his will.'], ['nerissa', 'I will help you break him. But how do I know you are not one of his creatures?']),
          hand: () => say('You do not touch the queen of the sea uninvited.'),
          item: (s, i) => {
            if (i === 'ring') {
              if (flag(s, 'got_mirror')) return say(['nerissa', 'Yes, yes, a stag. I remember.']);
              set(s, 'got_mirror'); gain(s, 'mirror'); pts(s, 'mirror', 10);
              return say(['nerissa', 'The stag of Thornmere. An honest house.'], 'She dives, and returns with a shell polished to a perfect mirror.', ['nerissa', 'The pearl\'s magic cannot touch a true reflection. When Varrick casts at you, hold this up. What is cast at you, send home.']);
            }
            if (i === 'fish') return say(['nerissa', 'Those are my subjects.'], 'You put the fish away, embarrassed.');
            return say(['nerissa', 'I have no need of that.']);
          }
        },
        { id: 'pool', name: 'tide pool', rect: [40, 168, 60, 20], look: () => say('Tiny crabs, glowing anemones, and a starfish who seems to be having a better day than you.') }
      ]
    },

    // ================= THE CASTLE =================
    tunnel: {
      name: "Smugglers' Tunnel", isle: 'crown',
      walk: [16, 152, 256, 190],
      enter: s => { pts(s, 'tunnel', 5); return once(s, 'seen_tunnel', ['Your light shows a narrow tunnel. Just ahead, a crack in the floor drops into nothing at all. Good thing you brought a light.']); },
      spots: [
        { id: 'back', name: 'way out to the cliffs', rect: [0, 120, 16, 80], at: [16, 172], exit: { to: 'cliffs', x: 225, y: 152 } },
        { id: 'stairs', name: 'stairs up', rect: [258, 56, 50, 100], at: [256, 160], exit: { to: 'cellar', x: 30, y: 176 } },
        { id: 'scrawl', name: 'scratched writing', rect: [96, 84, 70, 24], look: () => say('Old smugglers\' graffiti: "GRUMBO WOZ ERE." And below: "NO HE WOZNT. — GRUMBO\'S MUM."') },
        { id: 'chasm', name: 'chasm', rect: [120, 170, 60, 20], look: () => say('A crack in the floor, black and bottomless. You keep well clear.'), hand: () => ({ die: 'You reach down into the chasm to see how deep it goes. You find out personally.' }) }
      ]
    },

    cellar: {
      name: 'Castle Cellar', isle: 'crown',
      walk: [16, 154, 276, 194],
      spots: [
        { id: 'back', name: 'tunnel', rect: [0, 120, 16, 80], at: [16, 176], exit: { to: 'tunnel', x: 248, y: 162 } },
        { id: 'stairs', name: 'stairs up', rect: [278, 30, 42, 120], at: [274, 160], exit: { to: 'hall', x: 30, y: 180 } },
        { id: 'barrels', name: 'wine barrels', rect: [20, 92, 70, 56], look: () => say('Barrels of wedding wine. The Steward has spared no expense, mostly because it isn\'t his money.'), hand: () => say('Now is not the time to get drunk. Probably.') },
        {
          id: 'stone', name: 'loose stone', rect: [134, 86, 26, 20], at: [148, 160],
          look: s => say(flag(s, 'letter_found') ? 'An empty hole where the loose stone was.' : 'One stone in the wall sits a little crooked, with fresh scratches around its edges.'),
          hand: s => {
            if (flag(s, 'letter_found')) return say('The hiding place is empty now.');
            set(s, 'letter_found'); gain(s, 'letter'); pts(s, 'letter', 10);
            return say('You wiggle the stone loose. Behind it is a folded letter sealed with the Steward\'s seal. You read it, and your jaw tightens.', 'The king isn\'t dead. And here is the proof, in Varrick\'s own hand.');
          }
        },
        {
          id: 'guard', name: 'sleeping guard', rect: [214, 116, 46, 46],
          look: () => say('A guard snoring on a stool, a half-empty mug of wedding wine at his feet.'),
          talk: () => ({ die: '"Excuse me," you say politely.\n\nThe guard wakes up, sees a stranger in the cellar, and shouts. Half the castle guard comes running.\n\nSome sleeping guards are best left lying.' }),
          hand: () => ({ die: 'You give the guard a friendly shake. He wakes up, takes one look at you, and bellows for help.\n\nSome sleeping guards are best left lying.' })
        }
      ]
    },

    hall: {
      name: 'The Great Hall', isle: 'crown', scale: [162, 0.9, 194, 1.03],
      walk: [16, 162, 300, 194],
      enter: s => once(s, 'seen_hall', [
        'You slip into the back of the Great Hall. The wedding is under way. A veiled princess stands at the altar beside a thin man in black: Grand Steward Varrick. A black pearl glints at his throat.',
        'Nobody has noticed you yet. You won\'t get long once they do.'
      ]),
      spots: [
        { id: 'down', name: 'cellar stairs', rect: [0, 120, 16, 80], at: [16, 180], exit: { to: 'cellar', x: 266, y: 164 } },
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
            if (i === 'ring') { set(s, 'trust'); pts(s, 'trust', 10); return say('You hold up your signet ring. Elowen catches her breath and lifts her veil. For a moment, the dull look in her eyes clears.', ['elowen', 'The leaping stag... I saw you. In the mirror, a month ago. You\'re real.'], ['elowen', 'He\'s done something to me. I can\'t think straight. Captain Orla commands the guard. If you have proof, give it to her.']); }
            if (i === 'letter') return say(['elowen', 'Give it to Orla. The guard obeys her, not me. Not today.']);
            return say('Elowen gives you a puzzled look.');
          }
        },
        {
          id: 'orla', name: 'Captain Orla', rect: [246, 100, 26, 62], at: [244, 174],
          look: () => say('Captain Orla of the guard: grey-haired, armored, and frowning at the ceremony as if it smells bad.'),
          talk: s => flag(s, 'trust') ? say(['orla', 'The princess vouches for you. That buys you one minute. What have you got?']) : say(['orla', 'Who let you in? Speak quickly, stranger, before I decide you\'re a threat.']),
          item: (s, i) => {
            if (i === 'letter') {
              if (!flag(s, 'trust')) return say(['orla', 'A forged scrap from a stranger who sneaked into the castle? Nice try.'], 'She doesn\'t even read it. You need someone she trusts to vouch for you.');
              lose(s, 'letter'); set(s, 'unmasked'); pts(s, 'unmask', 10);
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
        { id: 'altar', name: 'altar', rect: [110, 40, 100, 50], look: () => say('Sea-green banners, piles of lilies, and a huge cake shaped like the castle. Somebody worked hard on this wedding. Shame about the groom.') }
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
        { id: 'down', name: 'stairs down', rect: [0, 120, 18, 80], at: [22, 176], walk: s => flag(s, 'beaten') ? { choose: leaveChoice } : say('Varrick\'s magic has sealed the door behind you.') },
        {
          id: 'varrick', name: 'Varrick', rect: [196, 92, 32, 68], at: [178, 178], gone: s => flag(s, 'beaten'),
          look: () => say('Varrick, crackling with dark lightning. The black pearl blazes at his throat.'),
          talk: () => ({ die: '"Let\'s talk about this," you begin.\n\nVarrick doesn\'t. The bolt of black lightning is the last thing you see.\n\nWhat is cast at you, someone once said, send home.' }),
          hand: () => ({ die: 'You charge Varrick. He flicks a finger, and you become a very surprised-looking sea urchin.\n\nWhat is cast at you, someone once said, send home.' }),
          item: (s, i) => {
            if (i === 'mirror') {
              set(s, 'beaten'); pts(s, 'defeat', 20);
              return say('Varrick hurls a bolt of black lightning. You raise the mirror shell.', 'The bolt strikes the shell, rebounds, and slams into the black pearl at Varrick\'s throat. The pearl cracks, then shatters with a sound like breaking ice.', ['varrick', 'No... NO!'], 'Varrick shrinks, and shrinks, and when the light fades there is nothing on the floor but a small, furious crab, clicking at you.', 'The black cage around Elowen dissolves. She stumbles into your arms.');
            }
            return { die: 'You hold it up at Varrick. He seems unimpressed. The bolt of black lightning is the last thing you see.\n\nWhat is cast at you, someone once said, send home.' };
          }
        },
        { id: 'crab', name: 'crab', rect: [196, 170, 24, 14], gone: s => !flag(s, 'beaten'), look: () => say('Formerly the Grand Steward. Currently a crab. He clicks at you menacingly, which is less menacing than it used to be.'), hand: () => say('You scoop up the crab and drop it out the window into the sea. It seems the kindest thing for everyone, especially you.') },
        {
          id: 'elowen', name: 'Elowen', rect: [248, 98, 26, 62], at: [244, 178],
          look: s => say(flag(s, 'beaten') ? 'Elowen, free and fierce, with storm-tangled hair. Her eyes are clear now.' : 'Elowen, frozen in a cage of crackling black light.'),
          talk: s => flag(s, 'beaten')
            ? say(['elowen', 'Rowan. You came.'], ['elowen', 'My father... Varrick told everyone he was dying. He\'s only sleeping. Please, is there anything that can wake him?'])
            : say('She can\'t hear you through the spell.'),
          hand: s => flag(s, 'beaten') ? say('You take her hand. It\'s cold, but it squeezes back.') : say('The black light stings your fingers.')
        },
        {
          id: 'king', name: 'sleeping king', rect: [40, 120, 90, 40], at: [94, 172],
          look: () => say('King Aldous of the Tidewater Isles, white-bearded and pale, sleeping a spell-sleep. Dark threads of magic wind around him.'),
          talk: () => say(['rowan', 'Your Majesty?'], 'He doesn\'t stir. This sleep is not the ordinary kind.'),
          hand: () => say('You shake his shoulder gently. Nothing.'),
          item: (s, i) => {
            if (i !== 'feather') return null;
            if (!flag(s, 'beaten')) return say('Varrick\'s magic crackles between you and the bier. Deal with the sorcerer first.');
            lose(s, 'feather'); s.won = 'long'; pts(s, 'king', 20);
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
        { id: 'book', name: 'spellbook', rect: [140, 110, 30, 20], look: () => say('Varrick\'s spellbook, open to a page titled "SLEEP ETERNAL, AND HOW TO PROFIT FROM IT."'), hand: () => say('Best not. Whatever is in that book is the reason for everything.') }
      ]
    }
  };

  function lightLamp(s) {
    if (flag(s, 'lit')) return say('The lamp is already blazing.');
    lose(s, 'lantern'); set(s, 'lit'); set(s, 'compass'); gain(s, 'compass'); pts(s, 'lit', 15); pts(s, 'compass', 5);
    return say('You hand Hester the forge lantern. She opens the great lamp, touches the ember to the wick, and with a WHUMP the lighthouse blazes back to life, throwing its beam across the sea.', ['hester', 'True fire. Ha! Let the Steward complain about the fish now.'], ['hester', 'I promised anything I own. Take my chart. With it you can sail to any of the isles, even the far ones.'], 'From now on, use your boat or the chart in your bag to sail anywhere.');
  }

  function sentinelAsk(s, who) {
    if (flag(s, 'asked')) return say([who, 'YOU HAVE ASKED YOUR QUESTION. CHOOSE YOUR STAIR.']);
    return { choose: { id: 'ask_' + who, prompt: `What do you ask ${who === 'granite' ? 'Granite' : 'Basalt'}?`, options: [['safe', '"Which stair is safe?"'], ['other', '"If I asked the other sentinel which stair is safe, what would it say?"'], ['liar', '"Which of you is the liar?"'], ['none', 'Ask nothing for now']] } };
  }

  function climb(s, side) {
    if (side === s.flags.safe) return { say: ['You climb the ' + side + ' stair. It winds up and up around the spire, solid as the island itself.'], go: { to: 'aerie', x: 40, y: 172 } };
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
      pts(s, 'sentq', 5);
      return say([who, `${other} WOULD SAY THE ${unsafe.toUpperCase()} STAIR.`], 'A clever question. Whichever one is lying, the answer points at the wrong stair.');
    };
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
    if (verb === 'item' && item === 'compass') return sp.id === 'boat' ? { map: true } : say('The chart is for sailing. Use it at your boat.');
    let r = null;
    const h = sp[verb];
    if (typeof h === 'function') r = h(s, item);
    if (!r && verb === 'walk' && sp.exit) r = { go: sp.exit };
    if (!r && verb === 'item') r = say(DEFAULTS.item);
    if (!r && verb !== 'walk') r = say(DEFAULTS[verb]);
    return r || {};
  }

  const choose = (s, id, opt) => CHOICES[id] ? CHOICES[id](s, opt) : {};

  // Sail by chart. Only from a room with a boat.
  function canSail(s) { return flag(s, 'compass') && ROOMS[s.room].spots.some(sp => sp.id === 'boat'); }
  function travel(s, isle) {
    if (!ISLES[isle]) return {};
    if (!canSail(s)) return say('You need to be at your boat to sail.');
    if (ROOMS[s.room].isle === isle) return say('You\'re already here.');
    return { say: ['You unroll Hester\'s chart and set your course for ' + ISLES[isle].name + '.'], go: ISLES[isle] };
  }

  function enter(s, go) {
    s.room = go.to; s.x = go.x; s.y = go.y;
    set(s, 'visited_' + ROOMS[go.to].isle);
    const e = ROOMS[go.to].enter;
    return e ? e(s) : null;
  }

  const api = { MAX_SCORE, ITEMS, ROOMS, ISLES, newState, act, choose, travel, canSail, enter, hitSpot, findSpot, spotsIn, has };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Game = api;
})(this);
