// The four endings (M7-15, M10-51, DESIGN sections 2 and 10): each route's name, what the crossing was and what's on
// the far side, and the last words on the summary, alone or with Xiaoyu.

export interface Ending { zh: string; en: string; far: string; alone: string; together: string }

export const ENDINGS: Record<string, Ending> = {
  bridge: {
    zh: '桥下', en: 'Beneath the Bridge',
    far: "The last of the truss in the dark, the river a long way down between the sleepers and the grey box at the bridgehead deaf behind him. On the Nan'an bank the streetlights are out, but someone has stood a candle in a window, and nothing on the far bridgehead turns to look.",
    alone: "He doesn't look back until the road bends. By then the fog has the whole city.",
    together: 'At the top of the bank Xiaoyu takes his sleeve, the way she did when she was small, and they go up the hill together without looking back.',
  },
  cable: {
    zh: '索道', en: 'The Cable',
    far: "The cabin swings out over the Yangtze with its lights off, the haul rope humming overhead and the towers going back into the cloud. Shangxin Street's station is dark and empty; the doors open on their own, and the stairs go down into a quiet street on the other side.",
    alone: "Halfway over he looks for the window he was sick out of, the time Nainai took them across. It isn't this cabin. Nothing is the same, and he's across.",
    together: "Xiaoyu presses her forehead to the window he was sick out of when she was six, and laughs for the first time in weeks. Nainai would have told them both off.",
  },
  boat: {
    zh: '雾中', en: 'Into the Fog',
    far: "The boat drifts with its engine off past the end of the peninsula, where the two rivers meet, the buoys blinking somewhere off in the white, a drone boat's wake slapping the hull and going on by. By first light Chaotianmen is a grey shape, then nothing, and the river carries on east.",
    alone: 'He sits in the stern with the screen dimmed to nothing, steering by the sound of the banks. When the fog lifts there is no city behind him at all.',
    together: "Xiaoyu sleeps in the bow under Uncle Deng's spare coat. When the fog lifts she wakes and asks where they are, and for once nobody knows, and it's all right.",
  },
  tunnel: {
    zh: '隧道尽头', en: "Tunnel's End",
    far: "Past the last dead pump the water goes down to his knees, then his ankles, and the tunnel climbs. A service door at the top opens onto a hillside in the rain, the city's glow behind the ridge, nothing in the sky but cloud.",
    alone: "He stands in the rain until he's soaked through, just to feel it. Then he walks on, slowly, the way the Line 1 driver said.",
    together: "Xiaoyu tips her face up into the rain, then holds out her hand for his torch. \"My turn,\" she says, and leads.",
  },
};
