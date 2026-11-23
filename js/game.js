// Crown of Tides — story, rooms and puzzle logic. Pure data + functions, no DOM,
// so the walkthrough test can run it in Node.
(function (root) {
  'use strict';

  const MAX_SCORE = 100;

  const ITEMS = {
    ring: { name: 'Signet ring', desc: 'Your signet ring, carved with the leaping stag of Thornmere. Proof of who you are, to anyone willing to look.' },
    bottle: { name: 'Corked bottle', desc: 'A green bottle with a rolled-up note inside. The cork is jammed in tight. Somebody really wanted this message to arrive.' },
    conch: { name: 'Conch shell', desc: 'A big spiral conch. Hold it to your ear and you hear the sea... and, very faintly, something that sounds like a voice.' },
    token: { name: 'Ferry token', desc: 'A brass token stamped with a little sailboat. Good for one trip to the Isle of Mists.' },
    glowcap: { name: 'Glowcap', desc: 'A fat mushroom glowing a soft, steady green. Better than a lantern, and it smells faintly of mint.' },
    whistle: { name: 'Silver whistle', desc: 'A slender silver whistle. Three notes are etched along its side, rising like a wave.' },
    letter: { name: "Varrick's letter", desc: 'A letter in the Steward\'s own hand: "The old king\'s true will is ash. My copy names me regent and Elowen\'s husband. The scribe has been paid for his silence. Burn this." He did not burn it.' }
  };

  const newState = () => ({ room: 'beach', x: 160, y: 172, inv: [], flags: {}, score: 0, won: false });

  // ---- helpers ----
  const has = (s, i) => s.inv.includes(i);
  const gain = (s, i) => { if (!has(s, i)) s.inv.push(i); };
  const lose = (s, i) => { s.inv = s.inv.filter(x => x !== i); };
  const flag = (s, f) => !!s.flags[f];
  const set = (s, f) => { s.flags[f] = true; };
  // Award points once per key.
  const pts = (s, key, n) => { const k = 'pts_' + key; if (s.flags[k]) return 0; s.flags[k] = true; s.score += n; return n; };
  const say = (...lines) => ({ say: lines });

  const ROOMS = {
    // ------------------------------------------------------------------
    beach: {
      name: 'Shipwreck Beach',
      walk: [12, 142, 308, 194],
      enter: s => flag(s, 'seen_beach') ? null : (set(s, 'seen_beach'), [
        'Salt water. Sand in places sand should never be. You are alive, which is more than can be said for your ship.',
        'You are Rowan, prince of Thornmere. A month ago a seer\'s mirror showed you the face of Princess Elowen of the Tidewater Isles, and you have thought of nothing else since.',
        'Somewhere beyond these dunes is her castle. Time to find out whether she was worth a shipwreck.'
      ]),
      spots: [
        { id: 'west', name: 'path to the cliffs', rect: [0, 120, 14, 80], at: [14, 168], exit: { to: 'cliffs', x: 290, y: 168 } },
        { id: 'east', name: 'path to the village', rect: [306, 120, 14, 80], at: [306, 170], exit: { to: 'square', x: 26, y: 172 } },
        {
          id: 'wreck', name: 'wreckage', rect: [18, 88, 100, 62], at: [96, 152],
          look: s => say(has(s, 'ring') || flag(s, 'ring_taken')
            ? 'What\'s left of the Gallant Stag. You\'ll miss her. You\'ve already taken anything worth taking.'
            : 'What\'s left of the Gallant Stag. Among the splintered planks, something gold catches the light.'),
          hand: s => {
            if (flag(s, 'ring_taken')) return say('Nothing else in the wreck but splinters and regret.');
            set(s, 'ring_taken'); gain(s, 'ring');
            return { say: ['You dig through the splinters and find your signet ring, still on its chain. Your father would have been furious if you\'d lost it.'], score: pts(s, 'ring', 5) };
          }
        },
        {
          id: 'bottle', name: 'bottle', rect: [192, 158, 16, 12], at: [196, 176], gone: s => flag(s, 'bottle_taken'),
          look: () => say('A green glass bottle, half buried in the sand. There\'s a note inside.'),
          hand: s => { set(s, 'bottle_taken'); gain(s, 'bottle'); return { say: ['You pull the bottle out of the sand. The cork won\'t budge, but the note inside looks old.'], score: pts(s, 'bottle', 5) }; }
        },
        {
          id: 'conch', name: 'conch shell', rect: [252, 174, 18, 12], at: [256, 186], gone: s => flag(s, 'conch_taken'),
          look: () => say('A large pink conch shell, bigger than your hand.'),
          hand: s => { set(s, 'conch_taken'); gain(s, 'conch'); return { say: ['You pick up the conch. When you hold it near your ear you could swear the sea is whispering a name.'], score: pts(s, 'conch', 5) }; }
        },
        {
          id: 'sea', name: 'sea', rect: [0, 70, 320, 44],
          look: () => say('The sea that ate your ship looks perfectly innocent now. Typical.'),
          hand: () => say('You\'ve had quite enough of the sea for one day.')
        }
      ]
    },

    // ------------------------------------------------------------------
    cliffs: {
      name: 'The Singing Cliffs',
      walk: [70, 146, 306, 192],
      spots: [
        { id: 'east', name: 'path to the beach', rect: [306, 120, 14, 80], at: [306, 168], exit: { to: 'beach', x: 24, y: 168 } },
        {
          id: 'door', name: 'carved door', rect: [196, 62, 58, 82], at: [225, 150],
          look: s => say(flag(s, 'door_open')
            ? 'The stone door stands open. A cold draft breathes out of the dark.'
            : 'A doorway carved into the cliff, framed by a ring of carved musical notes. In the middle is a small round hole, about the size of a whistle\'s mouth.'),
          hand: s => flag(s, 'door_open') ? say('It\'s already open.') : say('You push. You pull. The door has clearly been a cliff for a very long time and intends to stay one.'),
          talk: s => flag(s, 'door_open') ? say('The darkness does not answer.') : say('"Open sesame?" Nothing. Worth a try.'),
          item: (s, i) => {
            if (i !== 'whistle') return null;
            if (flag(s, 'door_open')) return say('The door is already open.');
            set(s, 'door_open');
            return { say: ['You put the silver whistle to your lips and play the three etched notes. The carved notes on the rock glow one by one, and with a deep grinding sound the door rolls aside.'], score: pts(s, 'door', 10) };
          },
          walk: s => {
            if (!flag(s, 'door_open')) return null;
            if (!has(s, 'glowcap')) return { die: 'You step into the pitch-black tunnel. Three steps in, the floor stops. You don\'t.\n\nNext time, maybe bring a light.' };
            return { go: { to: 'tunnel', x: 30, y: 172 } };
          }
        },
        {
          id: 'edge', name: 'cliff edge', rect: [0, 100, 66, 100],
          look: () => say('A sheer drop to the rocks and surf far below. Gulls wheel beneath you. Beneath you!'),
          hand: () => ({ die: 'You decide to climb down the cliff for a better look.\n\nYou get a much better look, very quickly.' }),
          walk: () => say('You get as close to the edge as your stomach allows, which isn\'t very close.')
        },
        { id: 'sea', name: 'sea', rect: [0, 60, 190, 40], look: () => say('The Tidewater Isles dot the horizon. One of them is wrapped in purple mist.') }
      ]
    },

    // ------------------------------------------------------------------
    square: {
      name: 'Saltmarrow Village',
      walk: [12, 150, 244, 194],
      enter: s => flag(s, 'seen_square') ? null : (set(s, 'seen_square'), ['The village of Saltmarrow huddles under the castle walls. Bunting hangs everywhere, but nobody looks very festive.']),
      spots: [
        { id: 'west', name: 'path to the beach', rect: [0, 140, 12, 60], at: [12, 172], exit: { to: 'beach', x: 294, y: 170 } },
        { id: 'south', name: 'road to the docks', rect: [100, 194, 120, 6], at: [160, 192], exit: { to: 'docks', x: 30, y: 168 } },
        { id: 'shop', name: 'curio shop', rect: [18, 86, 34, 54], at: [36, 152], exit: { to: 'shop', x: 40, y: 178 },
          look: () => say('A crooked little shop. The sign reads "BRAM\'S CURIOS — Treasures of the Tide."') },
        {
          id: 'board', name: 'notice board', rect: [64, 98, 30, 30], at: [80, 152],
          look: s => ({ say: ['A freshly nailed decree: "BY ORDER OF THE GRAND STEWARD. Princess Elowen will wed Grand Steward Varrick at sundown today. All rejoice. Rejoicing is mandatory."', 'Sundown. Today. That doesn\'t leave you much time.'], score: pts(s, 'board', 2) }),
          hand: () => say('Tearing down royal decrees is the sort of thing that gets you noticed by guards.')
        },
        {
          id: 'fountain', name: 'fountain', rect: [124, 112, 72, 40], at: [160, 156],
          look: () => say('A fountain of a leaping dolphin. Its basin is full of coins tossed in for luck.'),
          hand: () => ({ die: 'You scoop a handful of coins from the fountain. The guards at the gate are on you in seconds.\n\n"Robbing the Wishing Fountain on the princess\'s wedding day? The Steward will love this."\n\nYou spend the rest of your life in the Steward\'s dungeon, wishing.' }),
          item: (s, i) => i === 'token' ? say('You\'d rather keep the token than wish on it.') : null
        },
        {
          id: 'guards', name: 'castle guards', rect: [248, 92, 72, 70], at: [236, 168],
          look: () => say('Two guards in sea-green armor stand at the castle gate, looking as bored as only gate guards can.'),
          talk: () => say('"By order of the Grand Steward, nobody enters the castle until after the wedding. Move along."'),
          hand: () => say('The guards have spears. You have hands. You decide against it.'),
          item: (s, i) => {
            if (i === 'ring') return say('"A Thornmere signet? Lad, rings wash up on this beach every week. Move along."', 'They don\'t even look at it properly.');
            if (i === 'letter') return say('"Letters go through the Steward\'s office." Handing proof of the Steward\'s treachery to the Steward\'s office seems unwise.');
            return say('The guards aren\'t interested.');
          }
        },
        { id: 'castle', name: 'castle', rect: [200, 0, 120, 90], look: () => say('Tidewater Castle rises above the village, all white towers and sea-green banners. Elowen is in there somewhere.') }
      ]
    },

    // ------------------------------------------------------------------
    shop: {
      name: "Bram's Curios",
      walk: [20, 162, 300, 194],
      enter: s => flag(s, 'seen_shop') ? null : (set(s, 'seen_shop'), ['The shop is crammed with nets, shells, ship\'s wheels and a stuffed fish that seems to be judging you. An old man peers over the counter.']),
      spots: [
        { id: 'door', name: 'door', rect: [8, 76, 40, 84], at: [36, 176], exit: { to: 'square', x: 36, y: 156 } },
        {
          id: 'bram', name: 'Old Bram', rect: [196, 72, 36, 52], at: [214, 168],
          look: () => say('Old Bram has a beard like a sea-sponge and the squint of a man who has been appraising junk for sixty years.'),
          talk: s => flag(s, 'traded') ? say('"Safe travels, lad. Mind the mists out there. And don\'t follow any lights!"')
            : say('"Welcome, welcome! Bram buys what the sea brings. Messages in bottles most of all. Nothing like a stranger\'s secrets, eh?"', '"I\'ve a spare ferry token for anyone who brings me a good one."'),
          hand: () => say('Bram is not for sale.'),
          item: (s, i) => {
            if (i === 'bottle') {
              lose(s, 'bottle'); gain(s, 'token'); set(s, 'traded');
              return { say: ['Bram\'s eyes light up. He works the cork out with his teeth and reads the note aloud: "Dear Mum, the voyage is going fine, no need to worry. P.S. Please feed my goat."', '"Beautiful! Here, lad, a ferry token as promised. The ferryman at the docks will take you to the Isle of Mists."'], score: pts(s, 'token', 10) };
            }
            if (i === 'conch') return say('"Pretty, but I\'ve got a hundred of those. Now, the Oracle out on the Isle of Mists, she listens to shells. Says the sea tells her things."');
            if (i === 'ring') return say('"Keep that, lad. A crest like that might open doors someday. Or at least one door."');
            return say('"Not much call for that, I\'m afraid."');
          }
        },
        { id: 'shelf', name: 'shelves', rect: [60, 30, 120, 70], look: () => say('Ship in a bottle. Shrunken coconut. A mermaid\'s comb, price on request. A sign: "YOU BREAK IT, YOU SWIM FOR IT."'), hand: () => say('Bram clears his throat meaningfully.') },
        { id: 'fish', name: 'stuffed fish', rect: [250, 30, 50, 24], look: () => say('It stares at you with glassy disapproval. You stare back. You lose.') }
      ]
    },

    // ------------------------------------------------------------------
    docks: {
      name: 'Saltmarrow Docks',
      walk: [14, 150, 196, 192],
      spots: [
        { id: 'west', name: 'road to the village', rect: [0, 140, 14, 60], at: [14, 168], exit: { to: 'square', x: 160, y: 186 } },
        {
          id: 'nell', name: 'ferrywoman', rect: [168, 116, 26, 50], at: [160, 170],
          look: () => say('A weathered ferrywoman in an oilskin coat, chewing on an unlit pipe.'),
          talk: s => flag(s, 'paid') ? say('"Hop in whenever you\'re ready. I\'ll run you back and forth. Nothing else to do on a wedding day."')
            : say('"Ferry to the Isle of Mists. One token. No token, no boat. No exceptions, not even for handsome shipwrecked fellows."'),
          item: (s, i) => {
            if (i === 'token') { lose(s, 'token'); set(s, 'paid'); return { say: ['She bites the token, nods, and pockets it. "Climb aboard."'], score: pts(s, 'paid', 5) }; }
            if (i === 'ring') return say('"Pretty. Not a token."');
            return say('"Don\'t want it."');
          }
        },
        {
          id: 'boat', name: 'ferry boat', rect: [200, 130, 114, 44], at: [190, 168],
          look: () => say('A sturdy little ferry with a patched sail.'),
          hand: s => flag(s, 'paid') ? { say: ['You climb aboard. The ferrywoman pushes off, and the mists swallow you up.'], go: { to: 'mistshore', x: 210, y: 176 } } : say('"Oi! Token first!"'),
          walk: s => flag(s, 'paid') ? { say: ['You climb aboard. The ferrywoman pushes off, and the mists swallow you up.'], go: { to: 'mistshore', x: 210, y: 176 } } : say('"Oi! Token first!"')
        },
        { id: 'sea', name: 'sea', rect: [0, 60, 320, 60], look: () => say('Far out, an island sits wrapped in a purple haze. The Isle of Mists, presumably.') }
      ]
    },

    // ------------------------------------------------------------------
    mistshore: {
      name: 'Isle of Mists',
      walk: [12, 146, 300, 194],
      enter: s => flag(s, 'seen_mist') ? null : (set(s, 'seen_mist'), ['The mist is so thick you could spread it on bread. Strange lights drift between the trees.']),
      spots: [
        { id: 'boat', name: 'ferry boat', rect: [232, 168, 88, 32], at: [222, 180],
          look: () => say('The ferry bobs at the shore. The ferrywoman is pretending not to be nervous.'),
          hand: () => ({ say: ['You climb back aboard and the ferry carries you to Saltmarrow.'], go: { to: 'docks', x: 180, y: 170 } }),
          walk: () => ({ say: ['You climb back aboard and the ferry carries you to Saltmarrow.'], go: { to: 'docks', x: 180, y: 170 } }) },
        { id: 'cave', name: 'grotto', rect: [128, 66, 64, 70], at: [160, 150], exit: { to: 'oracle', x: 160, y: 188 },
          look: () => say('A grotto mouth, its stones carved with eyes. Very welcoming.') },
        {
          id: 'glowcaps', name: 'glowing mushrooms', rect: [36, 158, 48, 26], at: [62, 180],
          look: s => say(has(s, 'glowcap') ? 'Glowcaps. You\'ve already picked one; that\'s plenty.' : 'A clump of mushrooms glowing a soft green. Handy in the dark.'),
          hand: s => { if (has(s, 'glowcap')) return say('One glowcap is plenty. Leave some for the fairies.'); gain(s, 'glowcap'); return { say: ['You pick a plump glowcap. It keeps glowing in your hand.'], score: pts(s, 'glowcap', 5) }; }
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

    // ------------------------------------------------------------------
    oracle: {
      name: "The Oracle's Grotto",
      walk: [30, 152, 290, 194],
      spots: [
        { id: 'out', name: 'way out', rect: [0, 194, 320, 6], at: [160, 192], exit: { to: 'mistshore', x: 160, y: 154 } },
        {
          id: 'sibyl', name: 'Oracle', rect: [140, 70, 40, 66], at: [160, 160],
          look: () => say('An old woman sits cross-legged beside a glowing pool, her eyes milky white. She is looking right at you anyway.'),
          talk: s => {
            if (has(s, 'whistle') || flag(s, 'got_whistle')) return say('"The cliffs will sing for you now, Prince. Hurry. The sun does not wait for lovers."');
            return { say: [
              '"Rowan of Thornmere. The sea told me you would come."',
              '"Hear the truth: the old king\'s will did not name Varrick. The Steward burned it and forged his own. The proof lies in his own hand, hidden in the castle cellar."',
              '"The gates are shut to you, but the old smugglers\' way runs beneath the Singing Cliffs. Its door opens only to a song."',
              '"Bring me the voice of the sea, and I will give you the song."'
            ], score: pts(s, 'oracle', 3) };
          },
          hand: () => say('You don\'t poke oracles.'),
          item: (s, i) => {
            if (i === 'conch') {
              lose(s, 'conch'); gain(s, 'whistle'); set(s, 'got_whistle');
              return { say: ['The Oracle holds the conch to her ear and smiles. "Ah. The sea has been worried about you." She hands you a slender silver whistle.', '"Play its three notes at the Singing Cliffs."'], score: pts(s, 'whistle', 10) };
            }
            if (i === 'ring') return say('"I know who you are, child. It is the princess who must see that."');
            if (i === 'letter') return say('"Do not show it to me. Show it to someone who can arrest a Steward."');
            return say('"That is not the voice of the sea."');
          }
        },
        { id: 'pool', name: 'glowing pool', rect: [100, 136, 120, 18], look: () => say('In the pool you see a castle hall, a veiled bride, and a man in black smiling too widely. The sun outside is low.'), hand: () => say('The water is ice cold. The vision shivers and fades, then returns.') }
      ]
    },

    // ------------------------------------------------------------------
    tunnel: {
      name: "Smugglers' Tunnel",
      walk: [16, 152, 256, 190],
      enter: s => (pts(s, 'tunnel', 5), flag(s, 'seen_tunnel') ? null : (set(s, 'seen_tunnel'), ['The glowcap lights a narrow tunnel. Just ahead, a crack in the floor drops into nothing at all. Good thing you brought a light.'])),
      spots: [
        { id: 'back', name: 'way out to the cliffs', rect: [0, 120, 16, 80], at: [16, 172], exit: { to: 'cliffs', x: 225, y: 152 } },
        { id: 'stairs', name: 'stairs up', rect: [258, 56, 50, 100], at: [256, 160], exit: { to: 'cellar', x: 30, y: 176 } },
        { id: 'scrawl', name: 'scratched writing', rect: [96, 84, 70, 24], look: () => say('Old smugglers\' graffiti: "GRUMBO WOZ ERE." And below: "NO HE WOZNT. — GRUMBO\'S MUM."') },
        { id: 'chasm', name: 'chasm', rect: [120, 170, 60, 20], look: () => say('A crack in the floor, black and bottomless. You keep well clear.'), hand: () => ({ die: 'You reach down into the chasm to see how deep it goes. You find out personally.' }) }
      ]
    },

    // ------------------------------------------------------------------
    cellar: {
      name: 'Castle Cellar',
      walk: [16, 154, 276, 194],
      spots: [
        { id: 'back', name: 'tunnel', rect: [0, 120, 16, 80], at: [16, 176], exit: { to: 'tunnel', x: 248, y: 162 } },
        { id: 'stairs', name: 'stairs up', rect: [278, 30, 42, 120], at: [274, 160], exit: { to: 'hall', x: 30, y: 180 } },
        { id: 'barrels', name: 'wine barrels', rect: [20, 92, 70, 56], look: () => say('Barrels of wedding wine. The Steward has spared no expense, mostly because it isn\'t his money.'), hand: () => say('Now is not the time to get drunk. Probably.') },
        {
          id: 'stone', name: 'loose stone', rect: [136, 88, 22, 16], at: [148, 160],
          look: s => say(flag(s, 'letter_found') ? 'An empty hole where the loose stone was.' : 'One stone in the wall sits a little crooked, with fresh scratches around its edges.'),
          hand: s => {
            if (flag(s, 'letter_found')) return say('The hiding place is empty now.');
            set(s, 'letter_found'); gain(s, 'letter');
            return { say: ['You wiggle the stone loose. Behind it is a folded letter sealed with the Steward\'s seal. You read it, and your jaw tightens.', 'This is the proof the Oracle promised.'], score: pts(s, 'letter', 10) };
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

    // ------------------------------------------------------------------
    hall: {
      name: 'The Great Hall',
      walk: [16, 162, 300, 194],
      enter: s => flag(s, 'seen_hall') ? null : (set(s, 'seen_hall'), [
        'You slip into the back of the Great Hall. The wedding is under way. A veiled princess stands at the altar beside a thin man in black: Grand Steward Varrick.',
        'Nobody has noticed you yet. You won\'t get long once they do.'
      ]),
      spots: [
        { id: 'down', name: 'cellar stairs', rect: [0, 120, 16, 80], at: [16, 180], exit: { to: 'cellar', x: 266, y: 164 } },
        {
          id: 'varrick', name: 'Grand Steward Varrick', rect: [126, 92, 26, 60], at: [138, 170],
          look: () => say('Varrick: tall, thin, dressed in black on his own wedding day, with a smile like a crack in ice.'),
          talk: () => ({ die: '"I object!" you announce to Varrick.\n\n"Noted," says Varrick. "Guards, throw this objection into the sea."\n\nThey do. You have now been shipwrecked twice in one day.' }),
          hand: () => ({ die: 'You punch the groom. It is very satisfying for about two seconds.\n\nThe guards drag you off, and the Steward\'s smile is the last thing you see.' }),
          item: (s, i) => i === 'letter'
            ? { die: 'You wave the letter at Varrick. He plucks it from your hand, holds it to a candle, and smiles as it burns.\n\n"What letter?" he says, as the guards close in.' }
            : say('Varrick looks at it, and you, with polite contempt.')
        },
        {
          id: 'elowen', name: 'Princess Elowen', rect: [166, 92, 26, 60], at: [178, 170],
          look: s => say(flag(s, 'trust') ? 'Elowen has pushed back her veil. She is looking at you as if you were the only door out of a burning house.' : 'Princess Elowen, veiled in sea-green silk. Even through the veil you can tell she is not happy about this.'),
          talk: s => flag(s, 'trust') ? say('"Captain Orla commands the guard," she whispers. "If you have proof, give it to her."') : say('You whisper her name. She turns slightly, but who would trust a soggy stranger at her own wedding?'),
          hand: () => say('Grabbing the bride in front of fifty guards is not the romantic gesture it sounds like.'),
          item: (s, i) => {
            if (i === 'ring') { set(s, 'trust'); return { say: ['You hold up your signet ring. Elowen catches her breath and lifts her veil.', '"The leaping stag... I saw you. In the mirror, a month ago. You\'re real."', '"Captain Orla commands the guard. If you have proof, give it to her."'], score: pts(s, 'trust', 10) }; }
            if (i === 'letter') return say('Elowen glances at it and nods toward the captain of the guard. "Give it to Orla. The guard obeys her, not me, not today."');
            return say('Elowen gives you a puzzled look.');
          }
        },
        {
          id: 'orla', name: 'Captain Orla', rect: [246, 100, 26, 62], at: [244, 174],
          look: () => say('Captain Orla of the guard: grey-haired, armored, and frowning at the ceremony as if it smells bad.'),
          talk: s => flag(s, 'trust') ? say('"The princess vouches for you. That buys you one minute. What have you got?"') : say('"Who let you in? Speak quickly, stranger, before I decide you\'re a threat."'),
          item: (s, i) => {
            if (i === 'letter') {
              if (!flag(s, 'trust')) return say('Orla glances at the letter, then at you. "A forged scrap from a stranger who sneaked into the castle? Nice try." She doesn\'t even read it.', 'You need someone she trusts to vouch for you.');
              lose(s, 'letter'); s.won = true;
              return { say: [
                'Orla reads the letter. Her face goes from grey to red to a very dangerous white.',
                '"Varrick. Burned the king\'s will, did you? Paid off the scribe?" She draws her sword. "Guards! Seize the Steward!"',
                'Varrick bolts for the door and gets about four steps.',
                'Elowen tosses her veil into the crowd and takes your hand. "I believe," she says, "the hall is already decorated."'
              ], score: pts(s, 'win', 15), win: true };
            }
            if (i === 'ring') return say('"Fine ring. Means nothing to me. Means something to the princess, maybe."');
            return say('Orla is not impressed.');
          }
        },
        { id: 'altar', name: 'altar', rect: [110, 40, 100, 50], look: () => say('Sea-green banners, piles of lilies, and a huge cake shaped like the castle. Somebody worked hard on this wedding. Shame about the groom.') }
      ]
    }
  };

  const DEFAULTS = {
    look: 'Nothing special about it.',
    hand: 'You can\'t do anything with that.',
    talk: 'It doesn\'t have much to say.',
    item: 'That doesn\'t do anything.'
  };

  const spotsIn = (s, room) => ROOMS[room].spots.filter(sp => !(sp.gone && sp.gone(s)));
  const findSpot = (s, id) => spotsIn(s, s.room).find(sp => sp.id === id);
  const hitSpot = (s, x, y) => {
    // Last-defined small spots win over big background ones: search smallest area first.
    const hits = spotsIn(s, s.room).filter(sp => x >= sp.rect[0] && x < sp.rect[0] + sp.rect[2] && y >= sp.rect[1] && y < sp.rect[1] + sp.rect[3]);
    hits.sort((a, b) => a.rect[2] * a.rect[3] - b.rect[2] * b.rect[3]);
    return hits[0] || null;
  };

  // Apply a verb to a hotspot. Mutates s; returns {say, score, go, die, win}.
  function act(s, spotId, verb, item) {
    const sp = findSpot(s, spotId);
    if (!sp) return say(DEFAULTS[verb] || '');
    if (verb === 'item' && !has(s, item)) return say(DEFAULTS.item);
    let r = null;
    const h = sp[verb];
    if (typeof h === 'function') r = h(s, item);
    if (!r && verb === 'walk' && sp.exit) r = { go: sp.exit };
    if (!r && verb === 'item') r = say(DEFAULTS.item);
    if (!r && verb !== 'walk') r = say(DEFAULTS[verb]);
    return r || {};
  }

  // Move to a room. Returns intro lines (or null).
  function enter(s, go) {
    s.room = go.to; s.x = go.x; s.y = go.y;
    const e = ROOMS[go.to].enter;
    return e ? e(s) : null;
  }

  const api = { MAX_SCORE, ITEMS, ROOMS, newState, act, enter, hitSpot, findSpot, spotsIn, has };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Game = api;
})(this);
