// His sister's trail (M10-39, U-104, DESIGN section 2): each run Xiaoyu has gone to one of the four exits, leaving a
// note at each place she stopped on her way from the family flat; each note says where she went next only as a clue
// (somewhere they both know), and what she learned there about getting out, never all of it. She waits at the exit.
// `at` is where a note lies: 'desk' is her desk in the flat, anything else a place (a world teleport's name, or
// 'kind@name': the feature of that kind nearest it, sim/sister.ts). `waits` is where she is.

export interface Note { id: string; zh: string; en: string; at: string; text: string }
export interface Trail { waits: string; notes: Note[] }

export const TRAILS: Record<string, Trail> = {
  // Route A: across the Dongshuimen Bridge's rail deck. The market (the jammer's parts), the substation (the gloves for
  // the relay), Xiaoshizi (where Line 6 comes out of the hill onto the bridge).
  bridge: { waits: 'xiaoshizi', notes: [
    { id: 'xy-bridge-1', zh: '桌上的字条', en: 'Note on her desk', at: 'desk', text:
`Ge,
Mum went down to Jiaochangkou on the 14th to ask at desk 6 about Dad. She didn't take her bag. She didn't come back.
I've been sleeping at Mrs Tan's downstairs and coming up every night in case you were home. They've been through the flat twice now. I'm not waiting for the third time.
At night the trains still go over the river on the bridge below Xiaoshizi, all lit up, nobody on them. Where a train can go, so can I.
First I'm going to the man who fixed my phone screen, the one who buys dead drones. He listens to what they say.
Don't eat the rice in the tin. Weevils.
Xiaoyu` },
    { id: 'xy-bridge-2', zh: '折起来的字条', en: 'Folded note', at: 'Electronics market: door', text:
`Stall 2-117 is shuttered. Somebody's box of capacitors is still spilt on the stairs.
A woman sleeping by the loading dock knew him. She says the trains don't need a driver to see you on the bridge: the deck is wired, and a grey box at the bridgehead listens to the whole truss. Cut its wires and it's deaf. But it's live, it bites. Dad would know what to wear for that.
And they hear each other talk. Get close and you need something that shouts over them, made out of what they used to sell up here. I can't make one.
I'm going to Dad's work. Maybe he's there.` },
    { id: 'xy-bridge-3', zh: '铅笔写的字条', en: 'Note in pencil', at: 'Xinhua Road substation: gate', text:
`The chain on the back gate was already cut and twisted shut again with wire.
Dad's not here. I called and called. Inside the hall something cracks like firecrackers and blue light jumps on the windows. I didn't go in.
I could see his locker through the window, his name on it, his spare gloves on the hook. The thick orange ones. Couldn't reach.
I'm going to wait where Line 6 comes up out of the hill at Xiaoshizi, by the stairs down. You can see the bridge from there. Every night the empty train goes over and I count it across.
If you find this, Ge, that's where I am. Bring Dad's gloves.` },
  ] },
  // Route B: the Yangtze Cableway. The air-raid shelter (where she heard about the parked cabin), the substation (the
  // feeder and its one spare fuse), the cableway's north station.
  cable: { waits: 'cablewayNorth', notes: [
    { id: 'xy-cable-1', zh: '桌上的字条', en: 'Note on her desk', at: 'desk', text:
`Ge,
Mum went down to Jiaochangkou on the 14th to ask at desk 6 about Dad. She left her bag by the stairs. She hasn't come back.
They've been through the flat twice. I can't keep sleeping here.
The Pengs from No. 9 went to the hotpot place in the old air-raid shelter, the one Dad took us to for my birthday, where it was 18 degrees in August and you wore my scarf for a joke. People are living down there now. Somebody there will know a way out.
I've taken my bag, the torch and the last of the biscuits. Sorry.
Xiaoyu` },
    { id: 'xy-cable-2', zh: '餐巾纸上的字', en: 'Note on a napkin', at: 'Air-raid shelter', text:
`They've gone. Bowls on the tables, a baby's sock, the bucket still full.
The two university students were still here last night. Ma says on the first day a cabin stopped halfway over the river with people in it, and the operator brought it in on some emergency motor, and the other cabin is still sitting in the station. It just needs its power back. The power comes from the substation on Xinhua Road.
That's Dad's. The open day, where he let us wear the hard hats.
If anybody can turn it back on it's him. I'm going there.` },
    { id: 'xy-cable-3', zh: '撕下的一页', en: 'Torn-out page', at: 'Xinhua Road substation: gate', text:
`Dad isn't here.
The chain on the back gate was cut already. I got as far as the yard. Inside, something hums and snaps and blue light jumps across the hall.
Through the control room window there's his writing on the whiteboard: CABLEWAY FEEDER - FUSE GONE. SPARE: STORE. ONLY ONE.
Only one. I don't know which store. I'm not going in there.
I'm going to the cable car station and I'll wait in the cabin that's parked. Nainai took us across in it when I was six and you were sick out of the window. Somebody who runs it must have left the key somewhere.
Ge, if you come, I'm in the cabin.` },
  ] },
  // Route C: the river at night. The police station (boat 3's key), the river-police pier (the boat, dry and without
  // its battery; the buoys), the steps below Chaotianmen (where the fog boats went from).
  boat: { waits: 'river:steps@chaotianmen', notes: [
    { id: 'xy-boat-1', zh: '桌上的字条', en: 'Note on her desk', at: 'desk', text:
`Ge,
Mum went down to Jiaochangkou on the 14th to ask about Dad. She left her bag by the stairs. She didn't come back.
Mrs Tan says people have been getting out by the river at night, in the fog, with old Kang the fisherman. But Kang's boat sank, and he wants a real one.
Mum always said if we're ever in trouble, go to Uncle Deng. Dad's classmate, the river police captain. Mrs Tan says the river police were all called in to the police station down on the riverside road.
I'm going there to find him.
Xiaoyu
(If Dad comes home: I'm with Uncle Deng.)` },
    { id: 'xy-boat-2', zh: '折起来的字条', en: 'Folded note', at: 'Police station: shutter', text:
`The station's dark. The garage shutter's down. Inside the front door there's a gun on the ceiling that turns when you move. I saw it through the glass and lay on the steps for an hour.
Uncle Deng isn't here. His motorbike is, with the river police sticker.
Behind the duty desk there's a key cabinet, little hooks with paper tags. One tag's blue. I couldn't read it from the door.
His boats tie up at the river police pier, down past Dongshuimen toward the point. I'm going to look at them.` },
    { id: 'xy-boat-3', zh: '湿了的字条', en: 'Damp note', at: 'River-police pier: crane', text:
`The boats are here. I got down by the crane and lay flat on the deck.
Boat 3 has its cover half off. I unscrewed the fuel cap: dry, not even the smell. The battery box is empty, just two wires.
Out on the water there's a line of floats blinking all the way over to Nan'an, and something long and low going slowly up and down them. I threw a drink bottle out. It drifted right past and nothing came.
I'm going to the steps below Chaotianmen, the third flight down, where Kang's boat used to leave from. I'll wait for fog.
Ge, if you've got a boat, come at night.` },
  ] },
  // Route D: under the city. Where the Grand Tunnel meets the metro (the shut door, the water, the sensors), Jiefangbei
  // station (its control room, the card gone), the running tunnel east.
  tunnel: { waits: 'Metro tunnel', notes: [
    { id: 'xy-tunnel-1', zh: '桌上的字条', en: 'Note on her desk', at: 'desk', text:
`Ge,
Mum went down to Jiaochangkou on the 14th to ask about Dad. She didn't take her bag. She didn't come back.
They've been through the flat twice. At night I hear them on the stairs, the same steps every few hours.
The Shi brothers say people live under the city now: the old tunnels join the metro, and the metro goes everywhere, maybe even out. You and Haohao used to sneak into the big tunnel with the plaque Dad wouldn't let me read. I'm going down there, to where it meets the metro.
Torch, bag, the last biscuits. Sorry.
Xiaoyu` },
    { id: 'xy-tunnel-2', zh: '纸板上的字', en: 'Note on cardboard', at: 'Tunnel junction (metro)', text:
`Where the old tunnel meets the metro there's a family living behind boards. The father drove Line 1.
He says the running tunnel past Jiefangbei goes out under the city, but on the first day they shut a steel door across it, and past the door the water's come up because the pumps stopped. The staff opened that door with a card. He thinks the station kept one in the control room at Jiefangbei. Or the night staff in their lockers, at the end of the line.
He says don't run down there. They feel you walking.
I'm going to Jiefangbei station.` },
    { id: 'xy-tunnel-3', zh: '车票背面', en: 'Back of a metro ticket', at: 'Metro station Jiefangbei', text:
`The control room was open. Drawers out, papers everywhere. No card. Somebody got here first, or it was never here.
The platform screens still say WAIT TO BE COLLECTED. I'm not waiting to be collected.
I walked into the tunnel going east, slowly. A long way in there's a little doorway between the two tunnels with a lamp still on over it. I'm stopping there. Past it I can hear water.
I'll wait for you, Ge. Come slowly.` },
  ] },
};

/** Every note, for the items. */
export const NOTES: Note[] = Object.values(TRAILS).flatMap(t => t.notes);
