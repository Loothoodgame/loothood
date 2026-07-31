(function (root, factory) {
  const manifest = factory();
  if (typeof module === "object" && module.exports) module.exports = manifest;
  if (root) root.LoothoodProductionAudio = manifest;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  return Object.freeze({
  "schema": "loothood-production-audio-v1",
  "version": 3,
  "cacheToken": 13,
  "selectedSourcePolicy": "byte-identical",
  "fallbackOrder": [
    "m4a",
    "mp3"
  ],
  "bossLoopOverlapsMs": {
    "seed:ironOath:p1": 120,
    "seed:ironOath:p2": 60,
    "seed:deepRoot:p1": 80,
    "seed:deepRoot:p2": 60,
    "seed:huntersKnot:p1": 60,
    "seed:huntersKnot:p2": 40,
    "seed:bloodHunt:p1": 100,
    "seed:bloodHunt:p2": 60,
    "pair:ironOath+deepRoot:p1": 140,
    "pair:ironOath+deepRoot:p2": 60,
    "pair:ironOath+deepRoot:p3": 100,
    "pair:ironOath+huntersKnot:p1": 140,
    "pair:ironOath+huntersKnot:p2": 60,
    "pair:ironOath+huntersKnot:p3": 100,
    "pair:ironOath+bloodHunt:p1": 140,
    "pair:ironOath+bloodHunt:p2": 60,
    "pair:ironOath+bloodHunt:p3": 100,
    "pair:deepRoot+huntersKnot:p1": 140,
    "pair:deepRoot+huntersKnot:p2": 60,
    "pair:deepRoot+huntersKnot:p3": 100,
    "pair:deepRoot+bloodHunt:p1": 140,
    "pair:deepRoot+bloodHunt:p2": 60,
    "pair:deepRoot+bloodHunt:p3": 100,
    "pair:huntersKnot+bloodHunt:p1": 140,
    "pair:huntersKnot+bloodHunt:p2": 60,
    "pair:huntersKnot+bloodHunt:p3": 100
  },
  "tracks": {
    "menu:village": {
      "key": "menu:village",
      "sourceBase": "village-minstrels-emerald-spear",
      "bpm": 88,
      "duration": 168.045714,
      "loopStart": 0,
      "behavior": "full-loop",
      "scope": "village",
      "preserveRenderedSource": true,
      "formats": {
        "mp3": {
          "source": "game/assets/music/rendered/village-minstrels-emerald-spear.mp3",
          "destination": "game/assets/music/rendered/village-minstrels-emerald-spear.mp3",
          "sourceSha256": "67c2caee06be7434dc0eaad06b5c4374c68c315cd6cc53d44423f9cc84703ef0",
          "destinationSha256": "67c2caee06be7434dc0eaad06b5c4374c68c315cd6cc53d44423f9cc84703ef0",
          "bytes": 2018111,
          "codec": "mp3",
          "sampleRate": 44100,
          "channels": 2,
          "duration": 168.045714
        }
      },
      "title": "Emerald Spear",
      "credit": "Minstrels of Mirth"
    },
    "login:world1": {
      "key": "login:world1",
      "sourceBase": "login-two-rivers-the-ogier",
      "bpm": 88,
      "duration": 92.029388,
      "loopStart": 21.818181818181817,
      "behavior": "custom-loop",
      "scope": "login",
      "world": 1,
      "formats": {
        "mp3": {
          "source": "game/assets/music/rendered/login-two-rivers-the-ogier.mp3",
          "destination": "game/assets/music/rendered/login-two-rivers-the-ogier.mp3",
          "sourceSha256": "1530e388b5447d1d4b9a231a7a28228e64d87858dcd5cd0fc330998812e1b64d",
          "destinationSha256": "1530e388b5447d1d4b9a231a7a28228e64d87858dcd5cd0fc330998812e1b64d",
          "bytes": 1104851,
          "codec": "mp3",
          "sampleRate": 44100,
          "channels": 2,
          "duration": 92.029388
        }
      },
      "title": "The Ogier",
      "credit": "Two Rivers Tales"
    },
    "stage:1": {
      "key": "stage:1",
      "sourceBase": "early-dragon-tales-the-forest",
      "bpm": 100,
      "duration": 94.040816,
      "loopStart": 0,
      "behavior": "full-loop",
      "scope": "stage",
      "stage": 1,
      "formats": {
        "mp3": {
          "source": "game/assets/music/rendered/early-dragon-tales-the-forest.mp3",
          "destination": "game/assets/music/rendered/early-dragon-tales-the-forest.mp3",
          "sourceSha256": "90b5b6a6678cd35847735234a3719c2c590894f47e85da5ef7b751b5269d21a0",
          "destinationSha256": "90b5b6a6678cd35847735234a3719c2c590894f47e85da5ef7b751b5269d21a0",
          "bytes": 1128987,
          "codec": "mp3",
          "sampleRate": 44100,
          "channels": 2,
          "duration": 94.040816
        }
      },
      "title": "The Forest",
      "credit": "Dragon Tales"
    },
    "stage:2": {
      "key": "stage:2",
      "sourceBase": "early-dragon-tales-magical-forest",
      "bpm": 100,
      "duration": 151.536327,
      "loopStart": 0,
      "behavior": "full-loop",
      "scope": "stage",
      "stage": 2,
      "formats": {
        "mp3": {
          "source": "game/assets/music/rendered/early-dragon-tales-magical-forest.mp3",
          "destination": "game/assets/music/rendered/early-dragon-tales-magical-forest.mp3",
          "sourceSha256": "fa90c74e8f34c7cb46f648a9d89b0984c9ab384e56a0c44e94462a93b7e2150a",
          "destinationSha256": "fa90c74e8f34c7cb46f648a9d89b0984c9ab384e56a0c44e94462a93b7e2150a",
          "bytes": 1818937,
          "codec": "mp3",
          "sampleRate": 44100,
          "channels": 2,
          "duration": 151.536327
        }
      },
      "title": "Magical Forest",
      "credit": "Dragon Tales"
    },
    "stage:3": {
      "key": "stage:3",
      "sourceBase": "early-dragon-tales-the-forest",
      "bpm": 100,
      "duration": 94.040816,
      "loopStart": 0,
      "behavior": "full-loop",
      "scope": "stage",
      "stage": 3,
      "formats": {
        "mp3": {
          "source": "game/assets/music/rendered/early-dragon-tales-the-forest.mp3",
          "destination": "game/assets/music/rendered/early-dragon-tales-the-forest.mp3",
          "sourceSha256": "90b5b6a6678cd35847735234a3719c2c590894f47e85da5ef7b751b5269d21a0",
          "destinationSha256": "90b5b6a6678cd35847735234a3719c2c590894f47e85da5ef7b751b5269d21a0",
          "bytes": 1128987,
          "codec": "mp3",
          "sampleRate": 44100,
          "channels": 2,
          "duration": 94.040816
        }
      },
      "title": "The Forest",
      "credit": "Dragon Tales"
    },
    "stage:6": {
      "key": "stage:6",
      "sourceBase": "early-dragon-tales-magical-forest",
      "bpm": 104,
      "duration": 151.536327,
      "loopStart": 0,
      "behavior": "full-loop",
      "scope": "stage",
      "stage": 6,
      "formats": {
        "mp3": {
          "source": "game/assets/music/rendered/early-dragon-tales-magical-forest.mp3",
          "destination": "game/assets/music/rendered/early-dragon-tales-magical-forest.mp3",
          "sourceSha256": "fa90c74e8f34c7cb46f648a9d89b0984c9ab384e56a0c44e94462a93b7e2150a",
          "destinationSha256": "fa90c74e8f34c7cb46f648a9d89b0984c9ab384e56a0c44e94462a93b7e2150a",
          "bytes": 1818937,
          "codec": "mp3",
          "sampleRate": 44100,
          "channels": 2,
          "duration": 151.536327
        }
      },
      "title": "Magical Forest",
      "credit": "Dragon Tales"
    },
    "stage:7": {
      "key": "stage:7",
      "sourceBase": "early-dragon-tales-the-forest",
      "bpm": 104,
      "duration": 94.040816,
      "loopStart": 0,
      "behavior": "full-loop",
      "scope": "stage",
      "stage": 7,
      "formats": {
        "mp3": {
          "source": "game/assets/music/rendered/early-dragon-tales-the-forest.mp3",
          "destination": "game/assets/music/rendered/early-dragon-tales-the-forest.mp3",
          "sourceSha256": "90b5b6a6678cd35847735234a3719c2c590894f47e85da5ef7b751b5269d21a0",
          "destinationSha256": "90b5b6a6678cd35847735234a3719c2c590894f47e85da5ef7b751b5269d21a0",
          "bytes": 1128987,
          "codec": "mp3",
          "sampleRate": 44100,
          "channels": 2,
          "duration": 94.040816
        }
      },
      "title": "The Forest",
      "credit": "Dragon Tales"
    },
    "stage:8": {
      "key": "stage:8",
      "sourceBase": "early-dragon-tales-magical-forest",
      "bpm": 104,
      "duration": 151.536327,
      "loopStart": 0,
      "behavior": "full-loop",
      "scope": "stage",
      "stage": 8,
      "formats": {
        "mp3": {
          "source": "game/assets/music/rendered/early-dragon-tales-magical-forest.mp3",
          "destination": "game/assets/music/rendered/early-dragon-tales-magical-forest.mp3",
          "sourceSha256": "fa90c74e8f34c7cb46f648a9d89b0984c9ab384e56a0c44e94462a93b7e2150a",
          "destinationSha256": "fa90c74e8f34c7cb46f648a9d89b0984c9ab384e56a0c44e94462a93b7e2150a",
          "bytes": 1818937,
          "codec": "mp3",
          "sampleRate": 44100,
          "channels": 2,
          "duration": 151.536327
        }
      },
      "title": "Magical Forest",
      "credit": "Dragon Tales"
    },
    "stage:11": {
      "key": "stage:11",
      "sourceBase": "late-northlanders-wayland",
      "bpm": 108,
      "duration": 95.033469,
      "loopStart": 0,
      "behavior": "full-loop",
      "scope": "stage",
      "stage": 11,
      "formats": {
        "mp3": {
          "source": "game/assets/music/rendered/late-northlanders-wayland.mp3",
          "destination": "game/assets/music/rendered/late-northlanders-wayland.mp3",
          "sourceSha256": "282c6920a89bd43d4d7b78f5384f3179a3d401fd0d6dee8e3d2c861d37ead876",
          "destinationSha256": "282c6920a89bd43d4d7b78f5384f3179a3d401fd0d6dee8e3d2c861d37ead876",
          "bytes": 1141686,
          "codec": "mp3",
          "sampleRate": 44100,
          "channels": 2,
          "duration": 95.033469
        }
      },
      "title": "Wayland",
      "credit": "Northlanders"
    },
    "stage:12": {
      "key": "stage:12",
      "sourceBase": "late-northlanders-wayland",
      "bpm": 108,
      "duration": 95.033469,
      "loopStart": 0,
      "behavior": "full-loop",
      "scope": "stage",
      "stage": 12,
      "formats": {
        "mp3": {
          "source": "game/assets/music/rendered/late-northlanders-wayland.mp3",
          "destination": "game/assets/music/rendered/late-northlanders-wayland.mp3",
          "sourceSha256": "282c6920a89bd43d4d7b78f5384f3179a3d401fd0d6dee8e3d2c861d37ead876",
          "destinationSha256": "282c6920a89bd43d4d7b78f5384f3179a3d401fd0d6dee8e3d2c861d37ead876",
          "bytes": 1141686,
          "codec": "mp3",
          "sampleRate": 44100,
          "channels": 2,
          "duration": 95.033469
        }
      },
      "title": "Wayland",
      "credit": "Northlanders"
    },
    "stage:13": {
      "key": "stage:13",
      "sourceBase": "late-northlanders-wayland",
      "bpm": 108,
      "duration": 95.033469,
      "loopStart": 0,
      "behavior": "full-loop",
      "scope": "stage",
      "stage": 13,
      "formats": {
        "mp3": {
          "source": "game/assets/music/rendered/late-northlanders-wayland.mp3",
          "destination": "game/assets/music/rendered/late-northlanders-wayland.mp3",
          "sourceSha256": "282c6920a89bd43d4d7b78f5384f3179a3d401fd0d6dee8e3d2c861d37ead876",
          "destinationSha256": "282c6920a89bd43d4d7b78f5384f3179a3d401fd0d6dee8e3d2c861d37ead876",
          "bytes": 1141686,
          "codec": "mp3",
          "sampleRate": 44100,
          "channels": 2,
          "duration": 95.033469
        }
      },
      "title": "Wayland",
      "credit": "Northlanders"
    },
    "stage:14": {
      "key": "stage:14",
      "sourceBase": "late-northlanders-wayland",
      "bpm": 116,
      "duration": 95.033469,
      "loopStart": 0,
      "behavior": "full-loop",
      "scope": "stage",
      "stage": 14,
      "formats": {
        "mp3": {
          "source": "game/assets/music/rendered/late-northlanders-wayland.mp3",
          "destination": "game/assets/music/rendered/late-northlanders-wayland.mp3",
          "sourceSha256": "282c6920a89bd43d4d7b78f5384f3179a3d401fd0d6dee8e3d2c861d37ead876",
          "destinationSha256": "282c6920a89bd43d4d7b78f5384f3179a3d401fd0d6dee8e3d2c861d37ead876",
          "bytes": 1141686,
          "codec": "mp3",
          "sampleRate": 44100,
          "channels": 2,
          "duration": 95.033469
        }
      },
      "title": "Wayland",
      "credit": "Northlanders"
    },
    "warning:ironOath:4": {
      "key": "warning:ironOath:4",
      "sourceBase": "warning-stage4",
      "bpm": 108,
      "duration": 15.386122,
      "loopStart": 0,
      "behavior": "full-loop",
      "scope": "warning",
      "stage": 4,
      "seedId": "ironOath",
      "soundtrackSlot": "ironOath",
      "formats": {
        "mp3": {
          "source": "game/assets/music/rendered/warning-stage4.mp3",
          "destination": "game/assets/music/rendered/warning-stage4.mp3",
          "sourceSha256": "d29aace749c52b8d0247d203aa28d7d7e969afed74cb49072ab4939d5a437821",
          "destinationSha256": "d29aace749c52b8d0247d203aa28d7d7e969afed74cb49072ab4939d5a437821",
          "bytes": 184991,
          "codec": "mp3",
          "sampleRate": 44100,
          "channels": 2,
          "duration": 15.386122
        }
      },
      "title": "The Hunt Draws Near",
      "credit": "Loothood"
    },
    "warning:deepRoot:4": {
      "key": "warning:deepRoot:4",
      "sourceBase": "warning-stage4",
      "bpm": 108,
      "duration": 15.386122,
      "loopStart": 0,
      "behavior": "full-loop",
      "scope": "warning",
      "stage": 4,
      "seedId": "deepRoot",
      "soundtrackSlot": "deepRoot",
      "formats": {
        "mp3": {
          "source": "game/assets/music/rendered/warning-stage4.mp3",
          "destination": "game/assets/music/rendered/warning-stage4.mp3",
          "sourceSha256": "d29aace749c52b8d0247d203aa28d7d7e969afed74cb49072ab4939d5a437821",
          "destinationSha256": "d29aace749c52b8d0247d203aa28d7d7e969afed74cb49072ab4939d5a437821",
          "bytes": 184991,
          "codec": "mp3",
          "sampleRate": 44100,
          "channels": 2,
          "duration": 15.386122
        }
      },
      "title": "The Hunt Draws Near",
      "credit": "Loothood"
    },
    "warning:huntersKnot:4": {
      "key": "warning:huntersKnot:4",
      "sourceBase": "warning-stage4",
      "bpm": 108,
      "duration": 15.386122,
      "loopStart": 0,
      "behavior": "full-loop",
      "scope": "warning",
      "stage": 4,
      "seedId": "huntersKnot",
      "soundtrackSlot": "huntersKnot",
      "formats": {
        "mp3": {
          "source": "game/assets/music/rendered/warning-stage4.mp3",
          "destination": "game/assets/music/rendered/warning-stage4.mp3",
          "sourceSha256": "d29aace749c52b8d0247d203aa28d7d7e969afed74cb49072ab4939d5a437821",
          "destinationSha256": "d29aace749c52b8d0247d203aa28d7d7e969afed74cb49072ab4939d5a437821",
          "bytes": 184991,
          "codec": "mp3",
          "sampleRate": 44100,
          "channels": 2,
          "duration": 15.386122
        }
      },
      "title": "The Hunt Draws Near",
      "credit": "Loothood"
    },
    "warning:bloodHunt:4": {
      "key": "warning:bloodHunt:4",
      "sourceBase": "warning-stage4",
      "bpm": 108,
      "duration": 15.386122,
      "loopStart": 0,
      "behavior": "full-loop",
      "scope": "warning",
      "stage": 4,
      "seedId": "bloodHunt",
      "soundtrackSlot": "bloodHunt",
      "formats": {
        "mp3": {
          "source": "game/assets/music/rendered/warning-stage4.mp3",
          "destination": "game/assets/music/rendered/warning-stage4.mp3",
          "sourceSha256": "d29aace749c52b8d0247d203aa28d7d7e969afed74cb49072ab4939d5a437821",
          "destinationSha256": "d29aace749c52b8d0247d203aa28d7d7e969afed74cb49072ab4939d5a437821",
          "bytes": 184991,
          "codec": "mp3",
          "sampleRate": 44100,
          "channels": 2,
          "duration": 15.386122
        }
      },
      "title": "The Hunt Draws Near",
      "credit": "Loothood"
    },
    "warning:ironOath:9": {
      "key": "warning:ironOath:9",
      "sourceBase": "warning-stage9",
      "bpm": 112,
      "duration": 15.386122,
      "loopStart": 0,
      "behavior": "full-loop",
      "scope": "warning",
      "stage": 9,
      "seedId": "ironOath",
      "soundtrackSlot": "ironOath",
      "formats": {
        "mp3": {
          "source": "game/assets/music/rendered/warning-stage9.mp3",
          "destination": "game/assets/music/rendered/warning-stage9.mp3",
          "sourceSha256": "c1dfff00c2fb091a5031886be03f987cf0398f2febc061f3279e4f2a8723f1b1",
          "destinationSha256": "c1dfff00c2fb091a5031886be03f987cf0398f2febc061f3279e4f2a8723f1b1",
          "bytes": 184991,
          "codec": "mp3",
          "sampleRate": 44100,
          "channels": 2,
          "duration": 15.386122
        }
      },
      "title": "The Hunt Closes In",
      "credit": "Loothood"
    },
    "warning:deepRoot:9": {
      "key": "warning:deepRoot:9",
      "sourceBase": "warning-stage9",
      "bpm": 112,
      "duration": 15.386122,
      "loopStart": 0,
      "behavior": "full-loop",
      "scope": "warning",
      "stage": 9,
      "seedId": "deepRoot",
      "soundtrackSlot": "deepRoot",
      "formats": {
        "mp3": {
          "source": "game/assets/music/rendered/warning-stage9.mp3",
          "destination": "game/assets/music/rendered/warning-stage9.mp3",
          "sourceSha256": "c1dfff00c2fb091a5031886be03f987cf0398f2febc061f3279e4f2a8723f1b1",
          "destinationSha256": "c1dfff00c2fb091a5031886be03f987cf0398f2febc061f3279e4f2a8723f1b1",
          "bytes": 184991,
          "codec": "mp3",
          "sampleRate": 44100,
          "channels": 2,
          "duration": 15.386122
        }
      },
      "title": "The Hunt Closes In",
      "credit": "Loothood"
    },
    "warning:huntersKnot:9": {
      "key": "warning:huntersKnot:9",
      "sourceBase": "warning-stage9",
      "bpm": 112,
      "duration": 15.386122,
      "loopStart": 0,
      "behavior": "full-loop",
      "scope": "warning",
      "stage": 9,
      "seedId": "huntersKnot",
      "soundtrackSlot": "huntersKnot",
      "formats": {
        "mp3": {
          "source": "game/assets/music/rendered/warning-stage9.mp3",
          "destination": "game/assets/music/rendered/warning-stage9.mp3",
          "sourceSha256": "c1dfff00c2fb091a5031886be03f987cf0398f2febc061f3279e4f2a8723f1b1",
          "destinationSha256": "c1dfff00c2fb091a5031886be03f987cf0398f2febc061f3279e4f2a8723f1b1",
          "bytes": 184991,
          "codec": "mp3",
          "sampleRate": 44100,
          "channels": 2,
          "duration": 15.386122
        }
      },
      "title": "The Hunt Closes In",
      "credit": "Loothood"
    },
    "warning:bloodHunt:9": {
      "key": "warning:bloodHunt:9",
      "sourceBase": "warning-stage9",
      "bpm": 112,
      "duration": 15.386122,
      "loopStart": 0,
      "behavior": "full-loop",
      "scope": "warning",
      "stage": 9,
      "seedId": "bloodHunt",
      "soundtrackSlot": "bloodHunt",
      "formats": {
        "mp3": {
          "source": "game/assets/music/rendered/warning-stage9.mp3",
          "destination": "game/assets/music/rendered/warning-stage9.mp3",
          "sourceSha256": "c1dfff00c2fb091a5031886be03f987cf0398f2febc061f3279e4f2a8723f1b1",
          "destinationSha256": "c1dfff00c2fb091a5031886be03f987cf0398f2febc061f3279e4f2a8723f1b1",
          "bytes": 184991,
          "codec": "mp3",
          "sampleRate": 44100,
          "channels": 2,
          "duration": 15.386122
        }
      },
      "title": "The Hunt Closes In",
      "credit": "Loothood"
    },
    "seed:ironOath:p1": {
      "key": "seed:ironOath:p1",
      "sourceBase": "boss-dragon-tales-battle-of-the-dunes",
      "bpm": 106,
      "duration": 65.097143,
      "loopStart": 0,
      "behavior": "full-loop",
      "scope": "seed",
      "seedId": "ironOath",
      "soundtrackSlot": "ironOath",
      "phase": 1,
      "formats": {
        "mp3": {
          "source": "game/assets/music/rendered/boss-dragon-tales-battle-of-the-dunes.mp3",
          "destination": "game/assets/music/rendered/boss-dragon-tales-battle-of-the-dunes.mp3",
          "sourceSha256": "9f08ecaa34eaef30eeab687009d46b5663fd1c98c7df019e3921258e0033e50b",
          "destinationSha256": "9f08ecaa34eaef30eeab687009d46b5663fd1c98c7df019e3921258e0033e50b",
          "bytes": 781725,
          "codec": "mp3",
          "sampleRate": 44100,
          "channels": 2,
          "duration": 65.097143
        }
      },
      "title": "Battle of the Dunes",
      "credit": "Dragon Tales"
    },
    "seed:ironOath:p2": {
      "key": "seed:ironOath:p2",
      "sourceBase": "boss-dragon-tales-battle-of-the-dunes",
      "bpm": 146,
      "duration": 65.097143,
      "loopStart": 6.575342465753424,
      "behavior": "custom-loop",
      "scope": "seed",
      "seedId": "ironOath",
      "soundtrackSlot": "ironOath",
      "phase": 2,
      "formats": {
        "mp3": {
          "source": "game/assets/music/rendered/boss-dragon-tales-battle-of-the-dunes.mp3",
          "destination": "game/assets/music/rendered/boss-dragon-tales-battle-of-the-dunes.mp3",
          "sourceSha256": "9f08ecaa34eaef30eeab687009d46b5663fd1c98c7df019e3921258e0033e50b",
          "destinationSha256": "9f08ecaa34eaef30eeab687009d46b5663fd1c98c7df019e3921258e0033e50b",
          "bytes": 781725,
          "codec": "mp3",
          "sampleRate": 44100,
          "channels": 2,
          "duration": 65.097143
        }
      },
      "title": "Battle of the Dunes",
      "credit": "Dragon Tales"
    },
    "seed:deepRoot:p1": {
      "key": "seed:deepRoot:p1",
      "sourceBase": "boss-dragon-tales-battle-of-the-dunes",
      "bpm": 98,
      "duration": 65.097143,
      "loopStart": 9.795918367346939,
      "behavior": "custom-loop",
      "scope": "seed",
      "seedId": "deepRoot",
      "soundtrackSlot": "deepRoot",
      "phase": 1,
      "formats": {
        "mp3": {
          "source": "game/assets/music/rendered/boss-dragon-tales-battle-of-the-dunes.mp3",
          "destination": "game/assets/music/rendered/boss-dragon-tales-battle-of-the-dunes.mp3",
          "sourceSha256": "9f08ecaa34eaef30eeab687009d46b5663fd1c98c7df019e3921258e0033e50b",
          "destinationSha256": "9f08ecaa34eaef30eeab687009d46b5663fd1c98c7df019e3921258e0033e50b",
          "bytes": 781725,
          "codec": "mp3",
          "sampleRate": 44100,
          "channels": 2,
          "duration": 65.097143
        }
      },
      "title": "Battle of the Dunes",
      "credit": "Dragon Tales"
    },
    "seed:deepRoot:p2": {
      "key": "seed:deepRoot:p2",
      "sourceBase": "boss-dragon-tales-battle-of-the-dunes",
      "bpm": 112,
      "duration": 65.097143,
      "loopStart": 8.571428571428571,
      "behavior": "custom-loop",
      "scope": "seed",
      "seedId": "deepRoot",
      "soundtrackSlot": "deepRoot",
      "phase": 2,
      "formats": {
        "mp3": {
          "source": "game/assets/music/rendered/boss-dragon-tales-battle-of-the-dunes.mp3",
          "destination": "game/assets/music/rendered/boss-dragon-tales-battle-of-the-dunes.mp3",
          "sourceSha256": "9f08ecaa34eaef30eeab687009d46b5663fd1c98c7df019e3921258e0033e50b",
          "destinationSha256": "9f08ecaa34eaef30eeab687009d46b5663fd1c98c7df019e3921258e0033e50b",
          "bytes": 781725,
          "codec": "mp3",
          "sampleRate": 44100,
          "channels": 2,
          "duration": 65.097143
        }
      },
      "title": "Battle of the Dunes",
      "credit": "Dragon Tales"
    },
    "seed:huntersKnot:p1": {
      "key": "seed:huntersKnot:p1",
      "sourceBase": "boss-dragon-tales-battle-of-the-dunes",
      "bpm": 108,
      "duration": 65.097143,
      "loopStart": 0,
      "behavior": "full-loop",
      "scope": "seed",
      "seedId": "huntersKnot",
      "soundtrackSlot": "huntersKnot",
      "phase": 1,
      "formats": {
        "mp3": {
          "source": "game/assets/music/rendered/boss-dragon-tales-battle-of-the-dunes.mp3",
          "destination": "game/assets/music/rendered/boss-dragon-tales-battle-of-the-dunes.mp3",
          "sourceSha256": "9f08ecaa34eaef30eeab687009d46b5663fd1c98c7df019e3921258e0033e50b",
          "destinationSha256": "9f08ecaa34eaef30eeab687009d46b5663fd1c98c7df019e3921258e0033e50b",
          "bytes": 781725,
          "codec": "mp3",
          "sampleRate": 44100,
          "channels": 2,
          "duration": 65.097143
        }
      },
      "title": "Battle of the Dunes",
      "credit": "Dragon Tales"
    },
    "seed:huntersKnot:p2": {
      "key": "seed:huntersKnot:p2",
      "sourceBase": "boss-dragon-tales-battle-of-the-dunes",
      "bpm": 140,
      "duration": 65.097143,
      "loopStart": 6.857142857142857,
      "behavior": "custom-loop",
      "scope": "seed",
      "seedId": "huntersKnot",
      "soundtrackSlot": "huntersKnot",
      "phase": 2,
      "formats": {
        "mp3": {
          "source": "game/assets/music/rendered/boss-dragon-tales-battle-of-the-dunes.mp3",
          "destination": "game/assets/music/rendered/boss-dragon-tales-battle-of-the-dunes.mp3",
          "sourceSha256": "9f08ecaa34eaef30eeab687009d46b5663fd1c98c7df019e3921258e0033e50b",
          "destinationSha256": "9f08ecaa34eaef30eeab687009d46b5663fd1c98c7df019e3921258e0033e50b",
          "bytes": 781725,
          "codec": "mp3",
          "sampleRate": 44100,
          "channels": 2,
          "duration": 65.097143
        }
      },
      "title": "Battle of the Dunes",
      "credit": "Dragon Tales"
    },
    "seed:bloodHunt:p1": {
      "key": "seed:bloodHunt:p1",
      "sourceBase": "boss-dragon-tales-battle-of-the-dunes",
      "bpm": 90,
      "duration": 65.097143,
      "loopStart": 0,
      "behavior": "full-loop",
      "scope": "seed",
      "seedId": "bloodHunt",
      "soundtrackSlot": "bloodHunt",
      "phase": 1,
      "formats": {
        "mp3": {
          "source": "game/assets/music/rendered/boss-dragon-tales-battle-of-the-dunes.mp3",
          "destination": "game/assets/music/rendered/boss-dragon-tales-battle-of-the-dunes.mp3",
          "sourceSha256": "9f08ecaa34eaef30eeab687009d46b5663fd1c98c7df019e3921258e0033e50b",
          "destinationSha256": "9f08ecaa34eaef30eeab687009d46b5663fd1c98c7df019e3921258e0033e50b",
          "bytes": 781725,
          "codec": "mp3",
          "sampleRate": 44100,
          "channels": 2,
          "duration": 65.097143
        }
      },
      "title": "Battle of the Dunes",
      "credit": "Dragon Tales"
    },
    "seed:bloodHunt:p2": {
      "key": "seed:bloodHunt:p2",
      "sourceBase": "boss-dragon-tales-battle-of-the-dunes",
      "bpm": 124,
      "duration": 65.097143,
      "loopStart": 7.741935483870968,
      "behavior": "custom-loop",
      "scope": "seed",
      "seedId": "bloodHunt",
      "soundtrackSlot": "bloodHunt",
      "phase": 2,
      "formats": {
        "mp3": {
          "source": "game/assets/music/rendered/boss-dragon-tales-battle-of-the-dunes.mp3",
          "destination": "game/assets/music/rendered/boss-dragon-tales-battle-of-the-dunes.mp3",
          "sourceSha256": "9f08ecaa34eaef30eeab687009d46b5663fd1c98c7df019e3921258e0033e50b",
          "destinationSha256": "9f08ecaa34eaef30eeab687009d46b5663fd1c98c7df019e3921258e0033e50b",
          "bytes": 781725,
          "codec": "mp3",
          "sampleRate": 44100,
          "channels": 2,
          "duration": 65.097143
        }
      },
      "title": "Battle of the Dunes",
      "credit": "Dragon Tales"
    },
    "pair:ironOath+deepRoot:p1": {
      "key": "pair:ironOath+deepRoot:p1",
      "sourceBase": "final-dragon-tales-baldurs-gate-siege",
      "bpm": 78,
      "duration": 67.082449,
      "loopStart": 12.307692307692308,
      "behavior": "custom-loop",
      "scope": "pair",
      "stage": 15,
      "pairKey": "ironOath+deepRoot",
      "phase": 1,
      "introAllocation": "descending-dread",
      "formats": {
        "mp3": {
          "source": "game/assets/music/rendered/final-dragon-tales-baldurs-gate-siege.mp3",
          "destination": "game/assets/music/rendered/final-dragon-tales-baldurs-gate-siege.mp3",
          "sourceSha256": "c9d6e1b7ba516f1fa0815ae88ecc3e2ddf5d496dd3d8995ae740b72b318c57d3",
          "destinationSha256": "c9d6e1b7ba516f1fa0815ae88ecc3e2ddf5d496dd3d8995ae740b72b318c57d3",
          "bytes": 805548,
          "codec": "mp3",
          "sampleRate": 44100,
          "channels": 2,
          "duration": 67.082449
        }
      },
      "title": "Baldur's Gate Siege",
      "credit": "Dragon Tales"
    },
    "pair:ironOath+deepRoot:p2": {
      "key": "pair:ironOath+deepRoot:p2",
      "sourceBase": "final-dragon-tales-baldurs-gate-siege",
      "bpm": 104,
      "duration": 67.082449,
      "loopStart": 9.23076923076923,
      "behavior": "custom-loop",
      "scope": "pair",
      "stage": 15,
      "pairKey": "ironOath+deepRoot",
      "phase": 2,
      "introAllocation": "descending-dread",
      "formats": {
        "mp3": {
          "source": "game/assets/music/rendered/final-dragon-tales-baldurs-gate-siege.mp3",
          "destination": "game/assets/music/rendered/final-dragon-tales-baldurs-gate-siege.mp3",
          "sourceSha256": "c9d6e1b7ba516f1fa0815ae88ecc3e2ddf5d496dd3d8995ae740b72b318c57d3",
          "destinationSha256": "c9d6e1b7ba516f1fa0815ae88ecc3e2ddf5d496dd3d8995ae740b72b318c57d3",
          "bytes": 805548,
          "codec": "mp3",
          "sampleRate": 44100,
          "channels": 2,
          "duration": 67.082449
        }
      },
      "title": "Baldur's Gate Siege",
      "credit": "Dragon Tales"
    },
    "pair:ironOath+deepRoot:p3": {
      "key": "pair:ironOath+deepRoot:p3",
      "sourceBase": "final-dragon-tales-baldurs-gate-siege",
      "bpm": 116,
      "duration": 67.082449,
      "loopStart": 41.37931034482759,
      "behavior": "custom-loop",
      "scope": "pair",
      "stage": 15,
      "pairKey": "ironOath+deepRoot",
      "phase": 3,
      "introAllocation": "descending-dread",
      "formats": {
        "mp3": {
          "source": "game/assets/music/rendered/final-dragon-tales-baldurs-gate-siege.mp3",
          "destination": "game/assets/music/rendered/final-dragon-tales-baldurs-gate-siege.mp3",
          "sourceSha256": "c9d6e1b7ba516f1fa0815ae88ecc3e2ddf5d496dd3d8995ae740b72b318c57d3",
          "destinationSha256": "c9d6e1b7ba516f1fa0815ae88ecc3e2ddf5d496dd3d8995ae740b72b318c57d3",
          "bytes": 805548,
          "codec": "mp3",
          "sampleRate": 44100,
          "channels": 2,
          "duration": 67.082449
        }
      },
      "title": "Baldur's Gate Siege",
      "credit": "Dragon Tales"
    },
    "pair:ironOath+huntersKnot:p1": {
      "key": "pair:ironOath+huntersKnot:p1",
      "sourceBase": "final-dragon-tales-baldurs-gate-siege",
      "bpm": 78,
      "duration": 67.082449,
      "loopStart": 12.307692307692308,
      "behavior": "custom-loop",
      "scope": "pair",
      "stage": 15,
      "pairKey": "ironOath+huntersKnot",
      "phase": 1,
      "introAllocation": "vowel-descent",
      "formats": {
        "mp3": {
          "source": "game/assets/music/rendered/final-dragon-tales-baldurs-gate-siege.mp3",
          "destination": "game/assets/music/rendered/final-dragon-tales-baldurs-gate-siege.mp3",
          "sourceSha256": "c9d6e1b7ba516f1fa0815ae88ecc3e2ddf5d496dd3d8995ae740b72b318c57d3",
          "destinationSha256": "c9d6e1b7ba516f1fa0815ae88ecc3e2ddf5d496dd3d8995ae740b72b318c57d3",
          "bytes": 805548,
          "codec": "mp3",
          "sampleRate": 44100,
          "channels": 2,
          "duration": 67.082449
        }
      },
      "title": "Baldur's Gate Siege",
      "credit": "Dragon Tales"
    },
    "pair:ironOath+huntersKnot:p2": {
      "key": "pair:ironOath+huntersKnot:p2",
      "sourceBase": "final-dragon-tales-baldurs-gate-siege",
      "bpm": 104,
      "duration": 67.082449,
      "loopStart": 9.23076923076923,
      "behavior": "custom-loop",
      "scope": "pair",
      "stage": 15,
      "pairKey": "ironOath+huntersKnot",
      "phase": 2,
      "introAllocation": "vowel-descent",
      "formats": {
        "mp3": {
          "source": "game/assets/music/rendered/final-dragon-tales-baldurs-gate-siege.mp3",
          "destination": "game/assets/music/rendered/final-dragon-tales-baldurs-gate-siege.mp3",
          "sourceSha256": "c9d6e1b7ba516f1fa0815ae88ecc3e2ddf5d496dd3d8995ae740b72b318c57d3",
          "destinationSha256": "c9d6e1b7ba516f1fa0815ae88ecc3e2ddf5d496dd3d8995ae740b72b318c57d3",
          "bytes": 805548,
          "codec": "mp3",
          "sampleRate": 44100,
          "channels": 2,
          "duration": 67.082449
        }
      },
      "title": "Baldur's Gate Siege",
      "credit": "Dragon Tales"
    },
    "pair:ironOath+huntersKnot:p3": {
      "key": "pair:ironOath+huntersKnot:p3",
      "sourceBase": "final-dragon-tales-baldurs-gate-siege",
      "bpm": 116,
      "duration": 67.082449,
      "loopStart": 41.37931034482759,
      "behavior": "custom-loop",
      "scope": "pair",
      "stage": 15,
      "pairKey": "ironOath+huntersKnot",
      "phase": 3,
      "introAllocation": "vowel-descent",
      "formats": {
        "mp3": {
          "source": "game/assets/music/rendered/final-dragon-tales-baldurs-gate-siege.mp3",
          "destination": "game/assets/music/rendered/final-dragon-tales-baldurs-gate-siege.mp3",
          "sourceSha256": "c9d6e1b7ba516f1fa0815ae88ecc3e2ddf5d496dd3d8995ae740b72b318c57d3",
          "destinationSha256": "c9d6e1b7ba516f1fa0815ae88ecc3e2ddf5d496dd3d8995ae740b72b318c57d3",
          "bytes": 805548,
          "codec": "mp3",
          "sampleRate": 44100,
          "channels": 2,
          "duration": 67.082449
        }
      },
      "title": "Baldur's Gate Siege",
      "credit": "Dragon Tales"
    },
    "pair:ironOath+bloodHunt:p1": {
      "key": "pair:ironOath+bloodHunt:p1",
      "sourceBase": "final-dragon-tales-baldurs-gate-siege",
      "bpm": 78,
      "duration": 67.082449,
      "loopStart": 12.307692307692308,
      "behavior": "custom-loop",
      "scope": "pair",
      "stage": 15,
      "pairKey": "ironOath+bloodHunt",
      "phase": 1,
      "introAllocation": "vowel-descent",
      "formats": {
        "mp3": {
          "source": "game/assets/music/rendered/final-dragon-tales-baldurs-gate-siege.mp3",
          "destination": "game/assets/music/rendered/final-dragon-tales-baldurs-gate-siege.mp3",
          "sourceSha256": "c9d6e1b7ba516f1fa0815ae88ecc3e2ddf5d496dd3d8995ae740b72b318c57d3",
          "destinationSha256": "c9d6e1b7ba516f1fa0815ae88ecc3e2ddf5d496dd3d8995ae740b72b318c57d3",
          "bytes": 805548,
          "codec": "mp3",
          "sampleRate": 44100,
          "channels": 2,
          "duration": 67.082449
        }
      },
      "title": "Baldur's Gate Siege",
      "credit": "Dragon Tales"
    },
    "pair:ironOath+bloodHunt:p2": {
      "key": "pair:ironOath+bloodHunt:p2",
      "sourceBase": "final-dragon-tales-baldurs-gate-siege",
      "bpm": 104,
      "duration": 67.082449,
      "loopStart": 9.23076923076923,
      "behavior": "custom-loop",
      "scope": "pair",
      "stage": 15,
      "pairKey": "ironOath+bloodHunt",
      "phase": 2,
      "introAllocation": "vowel-descent",
      "formats": {
        "mp3": {
          "source": "game/assets/music/rendered/final-dragon-tales-baldurs-gate-siege.mp3",
          "destination": "game/assets/music/rendered/final-dragon-tales-baldurs-gate-siege.mp3",
          "sourceSha256": "c9d6e1b7ba516f1fa0815ae88ecc3e2ddf5d496dd3d8995ae740b72b318c57d3",
          "destinationSha256": "c9d6e1b7ba516f1fa0815ae88ecc3e2ddf5d496dd3d8995ae740b72b318c57d3",
          "bytes": 805548,
          "codec": "mp3",
          "sampleRate": 44100,
          "channels": 2,
          "duration": 67.082449
        }
      },
      "title": "Baldur's Gate Siege",
      "credit": "Dragon Tales"
    },
    "pair:ironOath+bloodHunt:p3": {
      "key": "pair:ironOath+bloodHunt:p3",
      "sourceBase": "final-dragon-tales-baldurs-gate-siege",
      "bpm": 116,
      "duration": 67.082449,
      "loopStart": 41.37931034482759,
      "behavior": "custom-loop",
      "scope": "pair",
      "stage": 15,
      "pairKey": "ironOath+bloodHunt",
      "phase": 3,
      "introAllocation": "vowel-descent",
      "formats": {
        "mp3": {
          "source": "game/assets/music/rendered/final-dragon-tales-baldurs-gate-siege.mp3",
          "destination": "game/assets/music/rendered/final-dragon-tales-baldurs-gate-siege.mp3",
          "sourceSha256": "c9d6e1b7ba516f1fa0815ae88ecc3e2ddf5d496dd3d8995ae740b72b318c57d3",
          "destinationSha256": "c9d6e1b7ba516f1fa0815ae88ecc3e2ddf5d496dd3d8995ae740b72b318c57d3",
          "bytes": 805548,
          "codec": "mp3",
          "sampleRate": 44100,
          "channels": 2,
          "duration": 67.082449
        }
      },
      "title": "Baldur's Gate Siege",
      "credit": "Dragon Tales"
    },
    "pair:deepRoot+huntersKnot:p1": {
      "key": "pair:deepRoot+huntersKnot:p1",
      "sourceBase": "final-dragon-tales-baldurs-gate-siege",
      "bpm": 78,
      "duration": 67.082449,
      "loopStart": 12.307692307692308,
      "behavior": "custom-loop",
      "scope": "pair",
      "stage": 15,
      "pairKey": "deepRoot+huntersKnot",
      "phase": 1,
      "introAllocation": "descending-dread",
      "formats": {
        "mp3": {
          "source": "game/assets/music/rendered/final-dragon-tales-baldurs-gate-siege.mp3",
          "destination": "game/assets/music/rendered/final-dragon-tales-baldurs-gate-siege.mp3",
          "sourceSha256": "c9d6e1b7ba516f1fa0815ae88ecc3e2ddf5d496dd3d8995ae740b72b318c57d3",
          "destinationSha256": "c9d6e1b7ba516f1fa0815ae88ecc3e2ddf5d496dd3d8995ae740b72b318c57d3",
          "bytes": 805548,
          "codec": "mp3",
          "sampleRate": 44100,
          "channels": 2,
          "duration": 67.082449
        }
      },
      "title": "Baldur's Gate Siege",
      "credit": "Dragon Tales"
    },
    "pair:deepRoot+huntersKnot:p2": {
      "key": "pair:deepRoot+huntersKnot:p2",
      "sourceBase": "final-dragon-tales-baldurs-gate-siege",
      "bpm": 104,
      "duration": 67.082449,
      "loopStart": 9.23076923076923,
      "behavior": "custom-loop",
      "scope": "pair",
      "stage": 15,
      "pairKey": "deepRoot+huntersKnot",
      "phase": 2,
      "introAllocation": "descending-dread",
      "formats": {
        "mp3": {
          "source": "game/assets/music/rendered/final-dragon-tales-baldurs-gate-siege.mp3",
          "destination": "game/assets/music/rendered/final-dragon-tales-baldurs-gate-siege.mp3",
          "sourceSha256": "c9d6e1b7ba516f1fa0815ae88ecc3e2ddf5d496dd3d8995ae740b72b318c57d3",
          "destinationSha256": "c9d6e1b7ba516f1fa0815ae88ecc3e2ddf5d496dd3d8995ae740b72b318c57d3",
          "bytes": 805548,
          "codec": "mp3",
          "sampleRate": 44100,
          "channels": 2,
          "duration": 67.082449
        }
      },
      "title": "Baldur's Gate Siege",
      "credit": "Dragon Tales"
    },
    "pair:deepRoot+huntersKnot:p3": {
      "key": "pair:deepRoot+huntersKnot:p3",
      "sourceBase": "final-dragon-tales-baldurs-gate-siege",
      "bpm": 116,
      "duration": 67.082449,
      "loopStart": 41.37931034482759,
      "behavior": "custom-loop",
      "scope": "pair",
      "stage": 15,
      "pairKey": "deepRoot+huntersKnot",
      "phase": 3,
      "introAllocation": "descending-dread",
      "formats": {
        "mp3": {
          "source": "game/assets/music/rendered/final-dragon-tales-baldurs-gate-siege.mp3",
          "destination": "game/assets/music/rendered/final-dragon-tales-baldurs-gate-siege.mp3",
          "sourceSha256": "c9d6e1b7ba516f1fa0815ae88ecc3e2ddf5d496dd3d8995ae740b72b318c57d3",
          "destinationSha256": "c9d6e1b7ba516f1fa0815ae88ecc3e2ddf5d496dd3d8995ae740b72b318c57d3",
          "bytes": 805548,
          "codec": "mp3",
          "sampleRate": 44100,
          "channels": 2,
          "duration": 67.082449
        }
      },
      "title": "Baldur's Gate Siege",
      "credit": "Dragon Tales"
    },
    "pair:deepRoot+bloodHunt:p1": {
      "key": "pair:deepRoot+bloodHunt:p1",
      "sourceBase": "final-dragon-tales-baldurs-gate-siege",
      "bpm": 78,
      "duration": 67.082449,
      "loopStart": 12.307692307692308,
      "behavior": "custom-loop",
      "scope": "pair",
      "stage": 15,
      "pairKey": "deepRoot+bloodHunt",
      "phase": 1,
      "introAllocation": "descending-dread",
      "formats": {
        "mp3": {
          "source": "game/assets/music/rendered/final-dragon-tales-baldurs-gate-siege.mp3",
          "destination": "game/assets/music/rendered/final-dragon-tales-baldurs-gate-siege.mp3",
          "sourceSha256": "c9d6e1b7ba516f1fa0815ae88ecc3e2ddf5d496dd3d8995ae740b72b318c57d3",
          "destinationSha256": "c9d6e1b7ba516f1fa0815ae88ecc3e2ddf5d496dd3d8995ae740b72b318c57d3",
          "bytes": 805548,
          "codec": "mp3",
          "sampleRate": 44100,
          "channels": 2,
          "duration": 67.082449
        }
      },
      "title": "Baldur's Gate Siege",
      "credit": "Dragon Tales"
    },
    "pair:deepRoot+bloodHunt:p2": {
      "key": "pair:deepRoot+bloodHunt:p2",
      "sourceBase": "final-dragon-tales-baldurs-gate-siege",
      "bpm": 104,
      "duration": 67.082449,
      "loopStart": 9.23076923076923,
      "behavior": "custom-loop",
      "scope": "pair",
      "stage": 15,
      "pairKey": "deepRoot+bloodHunt",
      "phase": 2,
      "introAllocation": "descending-dread",
      "formats": {
        "mp3": {
          "source": "game/assets/music/rendered/final-dragon-tales-baldurs-gate-siege.mp3",
          "destination": "game/assets/music/rendered/final-dragon-tales-baldurs-gate-siege.mp3",
          "sourceSha256": "c9d6e1b7ba516f1fa0815ae88ecc3e2ddf5d496dd3d8995ae740b72b318c57d3",
          "destinationSha256": "c9d6e1b7ba516f1fa0815ae88ecc3e2ddf5d496dd3d8995ae740b72b318c57d3",
          "bytes": 805548,
          "codec": "mp3",
          "sampleRate": 44100,
          "channels": 2,
          "duration": 67.082449
        }
      },
      "title": "Baldur's Gate Siege",
      "credit": "Dragon Tales"
    },
    "pair:deepRoot+bloodHunt:p3": {
      "key": "pair:deepRoot+bloodHunt:p3",
      "sourceBase": "final-dragon-tales-baldurs-gate-siege",
      "bpm": 116,
      "duration": 67.082449,
      "loopStart": 41.37931034482759,
      "behavior": "custom-loop",
      "scope": "pair",
      "stage": 15,
      "pairKey": "deepRoot+bloodHunt",
      "phase": 3,
      "introAllocation": "descending-dread",
      "formats": {
        "mp3": {
          "source": "game/assets/music/rendered/final-dragon-tales-baldurs-gate-siege.mp3",
          "destination": "game/assets/music/rendered/final-dragon-tales-baldurs-gate-siege.mp3",
          "sourceSha256": "c9d6e1b7ba516f1fa0815ae88ecc3e2ddf5d496dd3d8995ae740b72b318c57d3",
          "destinationSha256": "c9d6e1b7ba516f1fa0815ae88ecc3e2ddf5d496dd3d8995ae740b72b318c57d3",
          "bytes": 805548,
          "codec": "mp3",
          "sampleRate": 44100,
          "channels": 2,
          "duration": 67.082449
        }
      },
      "title": "Baldur's Gate Siege",
      "credit": "Dragon Tales"
    },
    "pair:huntersKnot+bloodHunt:p1": {
      "key": "pair:huntersKnot+bloodHunt:p1",
      "sourceBase": "final-dragon-tales-baldurs-gate-siege",
      "bpm": 78,
      "duration": 67.082449,
      "loopStart": 12.307692307692308,
      "behavior": "custom-loop",
      "scope": "pair",
      "stage": 15,
      "pairKey": "huntersKnot+bloodHunt",
      "phase": 1,
      "introAllocation": "vowel-descent",
      "formats": {
        "mp3": {
          "source": "game/assets/music/rendered/final-dragon-tales-baldurs-gate-siege.mp3",
          "destination": "game/assets/music/rendered/final-dragon-tales-baldurs-gate-siege.mp3",
          "sourceSha256": "c9d6e1b7ba516f1fa0815ae88ecc3e2ddf5d496dd3d8995ae740b72b318c57d3",
          "destinationSha256": "c9d6e1b7ba516f1fa0815ae88ecc3e2ddf5d496dd3d8995ae740b72b318c57d3",
          "bytes": 805548,
          "codec": "mp3",
          "sampleRate": 44100,
          "channels": 2,
          "duration": 67.082449
        }
      },
      "title": "Baldur's Gate Siege",
      "credit": "Dragon Tales"
    },
    "pair:huntersKnot+bloodHunt:p2": {
      "key": "pair:huntersKnot+bloodHunt:p2",
      "sourceBase": "final-dragon-tales-baldurs-gate-siege",
      "bpm": 104,
      "duration": 67.082449,
      "loopStart": 9.23076923076923,
      "behavior": "custom-loop",
      "scope": "pair",
      "stage": 15,
      "pairKey": "huntersKnot+bloodHunt",
      "phase": 2,
      "introAllocation": "vowel-descent",
      "formats": {
        "mp3": {
          "source": "game/assets/music/rendered/final-dragon-tales-baldurs-gate-siege.mp3",
          "destination": "game/assets/music/rendered/final-dragon-tales-baldurs-gate-siege.mp3",
          "sourceSha256": "c9d6e1b7ba516f1fa0815ae88ecc3e2ddf5d496dd3d8995ae740b72b318c57d3",
          "destinationSha256": "c9d6e1b7ba516f1fa0815ae88ecc3e2ddf5d496dd3d8995ae740b72b318c57d3",
          "bytes": 805548,
          "codec": "mp3",
          "sampleRate": 44100,
          "channels": 2,
          "duration": 67.082449
        }
      },
      "title": "Baldur's Gate Siege",
      "credit": "Dragon Tales"
    },
    "pair:huntersKnot+bloodHunt:p3": {
      "key": "pair:huntersKnot+bloodHunt:p3",
      "sourceBase": "final-dragon-tales-baldurs-gate-siege",
      "bpm": 116,
      "duration": 67.082449,
      "loopStart": 41.37931034482759,
      "behavior": "custom-loop",
      "scope": "pair",
      "stage": 15,
      "pairKey": "huntersKnot+bloodHunt",
      "phase": 3,
      "introAllocation": "vowel-descent",
      "formats": {
        "mp3": {
          "source": "game/assets/music/rendered/final-dragon-tales-baldurs-gate-siege.mp3",
          "destination": "game/assets/music/rendered/final-dragon-tales-baldurs-gate-siege.mp3",
          "sourceSha256": "c9d6e1b7ba516f1fa0815ae88ecc3e2ddf5d496dd3d8995ae740b72b318c57d3",
          "destinationSha256": "c9d6e1b7ba516f1fa0815ae88ecc3e2ddf5d496dd3d8995ae740b72b318c57d3",
          "bytes": 805548,
          "codec": "mp3",
          "sampleRate": 44100,
          "channels": 2,
          "duration": 67.082449
        }
      },
      "title": "Baldur's Gate Siege",
      "credit": "Dragon Tales"
    },
    "boss:defeat-impact": {
      "key": "boss:defeat-impact",
      "sourceBase": "sting-defeat-impact",
      "bpm": 112,
      "duration": 2.037551,
      "loopStart": 0,
      "behavior": "one-shot",
      "scope": "boss-victory",
      "stages": [
        5,
        10,
        15
      ],
      "oneShot": true,
      "preserveRenderedSource": true,
      "formats": {
        "mp3": {
          "source": "game/assets/music/rendered/sting-defeat-impact.mp3",
          "destination": "game/assets/music/rendered/sting-defeat-impact.mp3",
          "sourceSha256": "73c06c90569dc0183170e09bb66ecf136f4f00b43522341d25dfcb3ebec85518",
          "destinationSha256": "73c06c90569dc0183170e09bb66ecf136f4f00b43522341d25dfcb3ebec85518",
          "bytes": 24809,
          "codec": "mp3",
          "sampleRate": 44100,
          "channels": 2,
          "duration": 2.037551
        }
      },
      "title": "Fallen",
      "credit": "Loothood"
    },
    "boss:victory": {
      "key": "boss:victory",
      "sourceBase": "sting-boss-victory",
      "bpm": 112,
      "duration": 12.120816,
      "loopStart": 0,
      "behavior": "one-shot",
      "scope": "boss-victory",
      "stages": [
        5,
        10,
        15
      ],
      "oneShot": true,
      "preserveRenderedSource": true,
      "formats": {
        "mp3": {
          "source": "game/assets/music/rendered/sting-boss-victory.mp3",
          "destination": "game/assets/music/rendered/sting-boss-victory.mp3",
          "sourceSha256": "69e0b1e277a96bf9669a41a4267d9aac1aba7ea4843bf932bf16f091f82738cc",
          "destinationSha256": "69e0b1e277a96bf9669a41a4267d9aac1aba7ea4843bf932bf16f091f82738cc",
          "bytes": 145808,
          "codec": "mp3",
          "sampleRate": 44100,
          "channels": 2,
          "duration": 12.120816
        }
      },
      "title": "Quarry Taken",
      "credit": "Loothood"
    }
  }
});
});
