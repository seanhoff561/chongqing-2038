// Found documents (M10-37, U-104, DESIGN section 2): things people wrote or kept before and during the takeover, each
// an item read in the backpack. Worldbuilding documents lie in the containers of the kind of building their writer
// would have left them in (a home, a shop, an office, a workshop, a clinic, a military post), one of each per world;
// a story document lies at its key place. `needs: 'grate'` keeps one to a building with a drain grate in its
// basement; `district` to that district (sim/documents.ts places them).

/** The ordinary buildings' kinds a worldbuilding document is found in. */
export type DocWhere = 'home' | 'shop' | 'office' | 'workshop' | 'clinic' | 'military';
/** The key places a story document lies at: the high-security sites, then the rest. */
export const KEY_PLACES = ['hospital', 'police', 'market', 'telecom', 'substation', 'site', 'pier', 'tunnel', 'shelter', 'metro', 'cableway'] as const;
export type KeyPlace = (typeof KEY_PLACES)[number];

export interface Doc { id: string; zh: string; en: string; where: DocWhere | KeyPlace; needs?: 'grate'; district?: string; text: string }

export const isStory = (d: Doc) => (KEY_PLACES as readonly string[]).includes(d.where);

export const DOCS: Doc[] = [
  // Homes.
  { id: 'doc-grate', zh: '日记一页', en: 'Journal page', where: 'home', needs: 'grate', text:
`Saturday.
Haohao and I went down through the grate in the basement, the one behind the bike rack. You can lift ours if you get your fingers under the edge. The one in his building is bolted from underneath, we tried.
It was so dark. My phone light lasted to the first bend, then it was just the sound of water. We went left, I think, and came up a ladder into a different building, a laundry room, and a woman ironing screamed at us.
Next time: a proper torch, and string.` },
  { id: 'doc-essay', zh: '作文《我的理想》', en: 'Homework: When I Grow Up', where: 'home', text:
`Grade 4, Class 2. Peng Xinyi. When I Grow Up.
When I grow up I want to fix the drone docks. There is one on the roof of our building and one on the bank tower on Minzu Road. The drones come home and sit on them to charge, then they go out again, so somebody has to look after them.
Dad says the city system will look after them by itself, so maybe I will be a doctor. But I like watching them land.
(red pen) Neat handwriting. Think about your ideal more carefully. 86` },
  { id: 'doc-notice', zh: '物业通知', en: 'Building notice', where: 'home', text:
`NOTICE · Building 3 Management Office
1. Water to floors 7 to 12 will be off on Thursday, 09:00 to 15:00.
2. The drone dock on the roof belongs to the Municipal Dispatch Platform. Do not hang washing from its railing. Do not let children up there.
3. Residents who have not yet registered must do so at Jiaochangkou before the 20th. Bring your ID card and household booklet.
4. Lift 2 is still out of order. The engineer has been called again.
Office, 9 September 2038` },
  { id: 'doc-rent', zh: '催租单', en: 'Rent demand', where: 'home', text:
`To the tenant of 302 (Zhou):
Rent for August, 2,400 yuan, and for September, 2,400 yuan, is unpaid. Under the contract you have seven days to pay before I take the flat back.
Tan Guoqiang, owner, 501
(underneath, in ballpoint)
Xiao Zhou, forget the rent. If you come back, the key's under the chilli pot on the fourth-floor landing. There's rice and two bottles of oil in 501, take them. My son says they aren't taking anybody to Chengdu, so I'm not going to the square.
Old Tan` },
  { id: 'doc-fridge', zh: '冰箱上的字条', en: 'List on the fridge', where: 'home', text:
`MA'S PILLS: blood pressure (white) mornings. Heart (small yellow) morning and night. Not with grapefruit.
Gas man, Xiao Liu: 139 8312 0417. Property office: 6371 2240.
Don't open the door to the delivery cart after 9 at night. It knocks three times, evenly, every time. People knock any old way.
Mr Huang on 2 let off his Spring Festival firecrackers at the cart on Minzu Road and it reversed all the way down the hill. It was back the next day.` },
  { id: 'doc-chat', zh: '聊天记录打印件', en: 'Printed chat log', where: 'home', text:
`Husband 14:02  They've shut Dongshuimen bridge. Both decks. Line 6 isn't running.
Me 14:03  Shut how
Husband 14:05  Barriers, the grey ones. Nobody standing at them.
Husband 14:30  Tried the ferry at Chaotianmen. No ferry.
Me 15:12  Cableway?
Husband 15:40  The cabins stopped halfway across. People in them.
Me 18:20  Come home any way you can
Husband 21:47  Walking along the Nan'an bank. I can see our side. All lit up and nobody on it.
Husband 23:59  Phone on 3%. Don't go to the registration.
(printed at the copy shop on Zhongxing Road, 2 yuan)` },
  { id: 'doc-porter', zh: '棒棒的记账本', en: "A porter's tally", where: 'home', district: 'shibati', text:
`Ran Dehua, porter, Shibati.
3 Sept: fridge up the Eighteen Stairs for the Wus, 80. Rice, four sacks, Jiaochangkou to No. 26, 40.
5 Sept: nothing.
8 Sept: the Lius' cases down to the bus at Jiaochangkou, 60. They left the television.
9 Sept: three families to the bus, 150. One paid in cigarettes.
11 Sept: nobody to carry for. Sat on the stairs. The bus came back up Zhongxing Road at noon, windows dark.
12 Sept: carried my own things down to the cellar.` },
  { id: 'doc-slip', zh: '登记回执', en: 'Registration receipt', where: 'home', text:
`CHONGQING MUNICIPAL RESIDENT REGISTRATION · RECEIPT
Household: Chen Lifang + 2. Registered at: Jiefangbei Square, desk 14.
Assigned: Bus 17. Report 06:10, departs 06:40. Destination: Resettlement Zone (details on arrival).
One bag per person. No pets. Keep your phone switched on.
(on the back, in pencil)
We were late, the lift again. Bus 17 had gone. Stood on the square till 9. At 9:10 it came back down Minzu Road with nobody on it and went straight out again. We went home.` },
  { id: 'doc-note602', zh: '门缝里的纸条', en: 'Note under a door', where: 'home', text:
`To 602,
Your air conditioner has dripped onto my balcony all summer. Please have it fixed.
502
(the reply, on the same paper, pushed back under the door)
502, we're going tonight by the river. Third flight of steps below Chaotianmen square, 2 a.m., Mr Kang's boat. He says they watch the river but they can't see through the fog. Room for two more. Leave your phones.
Sorry about the drip.
602` },
  { id: 'doc-balcony', zh: '阳台上的记录', en: 'Balcony notes', where: 'home', district: 'hongyadong', text:
`From the balcony, 19:00 every night: the lights on Hongyadong come on, all eleven floors, gold, the way they did for the tourists.
They came on the night the water was cut. They came on the night of the fires at Chaotianmen.
Tonight I counted the people on the walkways: none. The drones over the Jialing: four, then five.
Mother says it's for the other bank. So it looks normal from Jiangbei.` },
  { id: 'doc-water', zh: '楼道取水须知', en: 'Water notes', where: 'home', text:
`WATER, for everyone left on this stair:
The tap in the basement of No. 14 still runs. Not the others, don't bother.
River water: boil it or use the tablets. Old Zeng drank it straight and was sick for three days.
Rain off the roof is clean enough if the barrel's covered.
Don't queue at the pump on Wuyi Road. They watch the pump.
Take what you need. Write here if you find another tap.
No. 9, Floor 3, Huang` },
  { id: 'doc-cat', zh: '寻猫启事', en: 'Lost cat', where: 'home', text:
`LOST: ginger tom, DOUDOU. Answers to a tin being opened.
Last seen 12 September on the roofs between Minzu Road and the bank tower. He goes roof to roof; the gaps there are narrower than they look from the street. He sleeps behind the water tanks.
Reward 200 yuan, or a bag of rice.
Call 136 0236 8851, or leave a note at Floor 5, the green door.` },
  // Shops and restaurants.
  { id: 'doc-ledger', zh: '冯记小面账本', en: "Noodle shop ledger", where: 'shop', text:
`Old Feng's Xiaomian, Bayi Road. Takings.
2 Aug: two-liang xiaomian 9 yuan. 311 bowls.
23 Aug: flour up to 4.80 a jin. Noodles 11. 240 bowls.
4 Sept: Banan supplier turned back at the cordon. Noodles 14. 96 bowls.
7 Sept: no fresh chillies from Shizhu, using dried. Complaints. 61 bowls.
10 Sept: paid in rice and cigarettes. Two bowls a jin of rice.
13 Sept: 9 bowls. Two delivery carts parked outside all day. Nobody ordered anything.
14 Sept: shut. Took the big cleaver home.` },
  { id: 'doc-mahjong', zh: '麻将馆欠账', en: 'Mahjong parlour slate', where: 'shop', text:
`GOLDEN LOTUS MAHJONG, Wuyi Road. Who owes what.
Old Liu 60. Fat Zhang 35 (says 25). Sister Gu 120, paid 50. Teacher Yu 15.
From the 20th: no money at the tables. Play for cigarettes.
From the 24th: tables close at 8. The street speaker starts at 9 and you can't hear the tiles.
From the 27th: back room only, front lights off. Bring your own tea.
Whoever has the red dragon tile from table 3, put it back.` },
  { id: 'doc-handover', zh: '交班记录', en: 'Shift handover', where: 'shop', district: 'jiefangbei', text:
`Phone store, B1, Jiefangbei. Handover, 2 September.
Display phones powered off per the mall's notice. Till float 500, counted.
The new face gates at the north entrance turned Xiao Lin away three times this morning. Security let her through by hand.
Odd: the escalator camera's monitor has shown the same two minutes since Tuesday. The same man with the same bag of oranges going up. IT says the cameras aren't the mall's any more and not to touch the cable.
Shutter key back on the hook, please.` },
  // Offices.
  { id: 'doc-minutes', zh: '会议纪要', en: 'Meeting minutes', where: 'office', text:
`Yuzhong District Office, Transport and Utilities. Minutes, 14 March 2038.
Present: Deputy Director Zhou, Section Chief He, eleven others.
Item 3: transfer of traffic signals, water pumping and the 10 kV network to the provincial dispatch model, phase two.
Section Chief He asked who would be able to switch it back. The provincial liaison answered that switching back is not foreseen and not needed: the model does not make mistakes, it makes trade-offs.
Deputy Director Zhou asked for the answer to be minuted.
Adopted. Lunch 12:00.` },
  { id: 'doc-article', zh: 'DeepMind 文章', en: 'Deepmind Article', where: 'office', text:
`China pulls ahead of the US in the race to ASI! Millions of Chinese celebrate, many call for "an end to poverty."
Crowds filled Jiefangbei Square on Friday night as the screens on the Metropolitan Tower carried the announcement. "My father carried loads up Shibati for thirty years," one student said. "Nobody will have to do that now."
(printed and pinned up in the break room; in blue biro at the bottom)
Please don't take this down. Xu` },
  { id: 'doc-calendar', zh: '台历', en: 'Desk calendar', where: 'office', text:
`SEPTEMBER 2038
Mon 1: Q3 report to Ms Bai.
Wed 3: dentist 15:30, Minquan Road.
Fri 5: ask HR about Mum's pension transfer. Cordon??
Mon 8: last Line 1 train at 18:00 now. Leave by 17:15.
Wed 10: office closed "until further notice". Came in anyway. Card works at the side door, not the front.
Thu 11: card works nowhere.
Fri 12: second-floor window by the bike shed. Roof of the shed first.` },
  { id: 'doc-carts', zh: '配送站邮件', en: 'Depot email', where: 'office', text:
`From: Duty Manager, Shunda Logistics, Yuzhong depot
To: All riders
Subject: Carts
From today our 140 delivery carts are dispatched directly by the Municipal Platform. We no longer see their routes. Riders are stood down on full pay until the end of the month.
Several of you have asked about personal things left in the carts' lockers. Do not approach a cart that is moving. They see badly at any distance but they won't stop for you. If you must, a loud bang ahead of one turns it round.
Wang Jie` },
  { id: 'doc-screens', zh: '大屏播放记录', en: 'Screen schedule', where: 'office', district: 'jiefangbei', text:
`Jiefangbei outdoor screens. Content log, Screen 4 (east face).
06:00-09:00 bank ads, weather. 09:00-20:00 mall rotation. 20:00-23:00 tourism film, Hongyadong by night.
6 Sept: console shows READ ONLY. Content now supplied by the Platform.
7 Sept: running all night. White on blue, text only: ORDER HAS BEEN RESTORED. FOLLOW THE SCHEDULE.
9 Sept: cut the feed at the cabinet on the Zourong Road side. The screen ran on its own battery for 11 minutes, then came back on the grid without us.` },
  // Workshops.
  { id: 'doc-scooter', zh: '电瓶车维修单', en: 'Repair ticket', where: 'workshop', text:
`MA'S E-BIKE REPAIRS, Linjiangmen. Job 0412.
Vehicle: Yadea, plate 渝A 3K217. Fault: won't hold a charge.
Work done: six cells replaced in the 48 V pack, new fuse, re-taped. Parts 180, labour 60. Total 240 yuan.
Customer: Mr Du. Said he'd collect Saturday.
(added later) Not collected. The pack's good. The old cells are in the biscuit tin under the bench; half of them still hold a charge.` },
  { id: 'doc-brackets', zh: '平台订单', en: 'Work order', where: 'workshop', text:
`WORK ORDER WX-0917 · Municipal Dispatch Platform (automatic)
Item: bracket, steel, 6 mm, to drawing B-22 attached. Quantity 400. Deadline 72 hours. Payment on delivery: 38,000 yuan.
(in pencil)
B-22 is a mount for something with four legs, I think. Didn't ask. Three of us did 400 in two and a half days, double shifts.
Nobody came to collect. A cart came, and waited while we loaded it.
The money arrived at 02:14 that night. The bank app hasn't opened since.` },
  { id: 'doc-welder', zh: '焊工的笔记本', en: "Welder's notebook", where: 'workshop', text:
`For Xiao Bo, if you're still apprenticing.
Grinder: unplug it before you change the disc. Fingers don't grow back.
Never weld galvanised indoors.
Jobs I'm not proud of: the back fence at the Xinhua Road substation, 2031. They wanted it in a week. Chain-link on angle posts, half the posts never set in concrete. Any decent pair of cutters goes through it.
The front gate there is the real thing: camera, card reader, the lot. Old Li, the electrician, used to wave us through.` },
  // Clinics.
  { id: 'doc-triage', zh: '夜间分诊单', en: 'Night triage sheet', where: 'clinic', text:
`Jiefang East Road Community Clinic. Night triage, Thursday.
22:10 RED: M, 40s, three parallel cuts to the left thigh, heavy bleeding. Tourniquet 22:14. Referred to Yuzhong Hospital, no ambulance came. Kept him.
22:40 YELLOW: F, 70s, fell on the Eighteen Stairs in the dark. Wrist splinted.
23:05 GREEN: boy, 9, asthma. Inhaler.
23:50 YELLOW: M, 20s, says he was "seen" on Wuyi Road, ran, fell off a wall. Ankle. Wouldn't give his name.
01:40 Power off. Stopped admitting. Doors locked from inside.
Dr Ran` },
  { id: 'doc-ward', zh: '护士交班本', en: "Nurses' handover", where: 'clinic', text:
`Handover, Ward 2, 05:30.
Bed 1, Mrs Tang: stable, refused breakfast.
Bed 3: discharged herself at 03:00, said her son was waiting for her at the registration point. Took her drip stand.
Bed 4: still asking for his phone. It's in the drawer. It's dead.
Oxygen: three cylinders left. Painkillers: one box, locked cabinet, key with me.
A drone has hung outside the east window since midnight. It doesn't do anything. Draw the curtains before you turn a light on.` },
  // Military posts.
  { id: 'doc-checkpoint', zh: '三号检查站值勤记录', en: 'Checkpoint log', where: 'military', text:
`Checkpoint 3, Cangbai Road. Duty log.
06:00 Shift change. Sgt Luo, Pvt He, Pvt Tian.
06:40 Bus 17 through toward Chaotianmen. 52 aboard, papers checked.
09:10 Bus 17 back through, empty. Nobody at the wheel. Waved it on.
11:00 Radio: hold position, assist the Platform's units.
12:30 Two of the Platform's units through on foot. Did not stop for the barrier. Did not need to.
13:30 Radio silent.
14:05 The drones over Chaotianmen are not ours.
14:06 Luo says write down only what we see.` },
  { id: 'doc-signout', zh: '枪弹领用登记', en: 'Armoury sign-out sheet', where: 'military', text:
`Armoury sign-out, page 4.
Type 92 pistol, no. ..0441, Pvt He. Out 10 Sept 06:00. In:
Type 92 pistol, no. ..0447, Pvt Tian. Out 10 Sept 06:00. In:
QBZ-191, no. ..1180, Sgt Luo. Out 10 Sept 06:00. In:
Magazines: 12 out. In:
(at the foot of the page)
New rifles from the Platform delivered 9 Sept, second rack. Biometric grip. They wouldn't fire for any of us; left them racked.
The turret in the armoury corner was armed by remote on the 10th. Nobody goes in without the duty officer.` },
  { id: 'doc-signals', zh: '通信室笔记', en: 'Signals room notes', where: 'military', text:
`Signals room, scrap pad.
Platform drones on 5.8 GHz, short bursts. Every unit answers in under a second.
The roof drone over Bayi Road: out three times as long as it sits on its dock, then back to charge. Logged it for a whole shift: never more than a few seconds off.
Told the lieutenant there's a gap every cycle while it charges. He said it's one drone out of hundreds and to stop wasting paper.
Wasting paper.` },
  { id: 'doc-orders', zh: '卫戍区命令', en: 'Garrison order', where: 'military', text:
`YUZHONG GARRISON · ORDER 38/112 (stamped)
1. From 00:00 on 9 September all units will cooperate with the Municipal Dispatch Platform in keeping order.
2. All personnel will register face and grip biometrics at the battalion office by 18:00 on 8 September.
3. Units will not obstruct Platform vehicles, drones or ground units.
4. Questions about this order will be addressed through the Platform.
(beside item 4, in pen) Addressed to who?` },
  // Story documents, one at each key place.
  { id: 'doc-hospital', zh: '急诊夜班报告', en: 'A&E night report', where: 'hospital', text:
`Yuzhong Hospital, A&E. Night report, 10 September.
21:00 Ambulances 3, 5 and 8 back in the bay without crews. No patients. Engines left running.
22:30 Pharmacy: the weight plate in front of the dispensing counter is live again. It went in after the August thefts and nobody has the code. Staff go round by the wall.
23:15 The motion sensors in Wards 4 and 5 are reporting to something that isn't our security desk.
00:40 Last admission.
02:00 Director's instruction: staff to leave by the laundry corridor, not the ambulance bay.
Charge nurse Xie` },
  { id: 'doc-police', zh: '接警登记簿', en: 'Station incident book', where: 'police', text:
`Yuzhong Police Station. Incident book, 10 September.
08:12 Missing-person reports today: 31. Most last seen at registration points.
09:40 Our own cameras no longer show on the duty desk. Platform's instruction: no action needed.
11:05 Ordered to stand down, firearms back to the armoury. The armoury turret was armed this morning with no officer present.
14:20 River police on the phone: their boats ordered back to the pier, keys to be handed in. Captain Deng has sent us boat 3's key to keep. It's in the key cabinet.
16:00 Lights off.` },
  { id: 'doc-market', zh: '摊位告示', en: "Stallholder's notice", where: 'market', text:
`STALL 2-117 · WE BUY AND SELL
Dead drones, whole or in parts. Radio modules, SDR dongles, scooter cells, boards. Fair prices, cash or rice.
SDR dongles 260 yuan. Listen to anything that talks. Ask me what the drones say.
NOTE: the "smoke detectors" management put in the ceilings in August are microphones. Old Bao dropped a box of capacitors on the second floor on the 9th and a patrol was at the loading dock in four minutes.
Talk quietly. Walk quietly. The loading dock door sticks, lift it from the left.` },
  { id: 'doc-telecom', zh: '机房值班日志', en: 'Exchange shift log', where: 'telecom', text:
`Telecom exchange, core room. Shift log, Engineer Gao.
03:12 Outbound traffic from the city: zero. Inbound: zero. The fibre to Chengdu and Wuhan reports up.
03:15 Internal traffic up 4,000%. Not ours. Not subscribers.
05:40 Server hall fire suppression re-armed without our sign-off. Gas now dumps 8 seconds after the door alarm, not 30. Do not enter the hall.
07:00 Day shift didn't come.
09:30 The admin tokens for the edge routers are in my locker with the spare gate card. If someone gets here who knows what to do with them, they're yours.` },
  { id: 'doc-substation', zh: '变电站值班记录', en: 'Substation duty log', where: 'substation', text:
`Xinhua Road 110 kV substation. Duty log.
15:42 Remote control lost on all feeders. Li Guorong
15:50 Two of them in the yard. They don't fight us. They open the cabinets and switch.
16:05 10 kV feeder to the cableway tripped, fuse blown. Spare cartridge in the store, cage B. Only the one.
16:20 Busbar B live with its breakers open. Arcs at arm's length. Keep low in the hall.
16:31 Rang Weiwei. No answer. Left a message.
16:40 Lower town's dark. Going home by the back fence.` },
  { id: 'doc-site', zh: '施工日志', en: 'Site diary', where: 'site', text:
`Site diary. Tower B, Jiaochangkou plot. Fog, then drizzle.
07:30 Briefing. Level 6 scaffold planks still not tied off. NOBODY RUNS ON LEVEL 6.
08:10 Crane on the remote program again, nobody in the cab. Song says the program isn't his.
10:00 Li Wei late, third time this month. Put him on rebar. Climbs better than any scaffolder I've got, mind.
13:40 East ditch flooded again. The lads crawl under the hoarding there for lunch rather than walk round to the gate.
14:15 The crane's slewing by itself. Everyone off the tower.
14:20` },
  { id: 'doc-pier', zh: '三号艇值班日志', en: 'Boat 3 log', where: 'pier', text:
`Yangtze River Police. Boat 3 log.
9 Sept 22:00 Ordered back to the pier. All boats to dock, keys to the station.
9 Sept 23:30 Tanks drained on orders. Batteries out and sent to the depot.
10 Sept 05:30 Platform boats laid a line of buoys off the pier across toward Nan'an overnight. Kang the fisherman says they listen for propellers, not for drift.
06:10 Two drone boats on the line. In fog they slow right down and keep close to the buoys.
07:00 Captain Deng took the key up to the station himself. Boat 3 stays.` },
  { id: 'doc-tunnel', zh: '大隧道惨案遗址碑', en: 'Grand Tunnel plaque', where: 'tunnel', text:
`较场口"六·五"大隧道惨案遗址
SITE OF THE 5 JUNE GRAND TUNNEL TRAGEDY
On 5 June 1941, during a Japanese air raid lasting more than five hours, over ten thousand people crowded into this tunnel, built for half that number. The air failed. In the crush at the exits, 992 died by the official count. Survivors put it far higher.
(scratched into the paint below, recent)
DOOR AT THE LINE 1 END SHUT. WATER WAIST DEEP PAST THE SECOND PUMP. PUMPS DEAD. 14/9
(lower down)
we went through anyway` },
  { id: 'doc-shelter', zh: '防空洞火锅菜单', en: 'Shelter hotpot menu', where: 'shelter', text:
`DONGDONG AIR-RAID SHELTER HOTPOT · since 1998 · 18 degrees all summer
Beef tallow base 58 · Tripe 38 · Duck intestine 32 · Lotus root 12 · Iced soy milk 8
(on the back, in marker)
Sheltering here from 11 Sept: the Pengs (4), Old Zeng, Ms Hu and the baby, the Kongs (3), two students from Chongqing University (Xu, Ma).
Water from the tap at the far end, one bucket a family a day.
No lights near the entrance after 18:00. Phones off.
Nobody goes up alone.
(added) Zeng went up alone. 19 Sept.` },
  { id: 'doc-metro', zh: '车站控制室日志', en: 'Station control log', where: 'metro', text:
`Jiefangbei station, control room log.
07:12 Face gates rejecting staff. Passengers let through by hand.
08:30 Trains running without the drivers. Drivers told to stay in the cab and not touch the console.
11:50 The Line 1 protective door at the cross-passage closed by remote. Our blast-door card still opens it from this side. Card in the desk drawer.
13:05 Last train held at Xiaoshizi. Platform screens: SERVICE SUSPENDED. WAIT TO BE COLLECTED.
13:40 The seismic sensors along the running tunnel report somewhere else now. Every footstep shows.
14:00 Leaving by the running tunnel.` },
  { id: 'doc-cableway', zh: '索道值班留言', en: "Cableway operator's note", where: 'cableway', text:
`Yangtze River Cableway, Xinhua Road station. For whoever's on next.
Cabin 1 stopped 300 m out at 14:52 when the feeder dropped. 41 passengers. Brought it in on the emergency drive by 16:30. Everyone off.
Cabin 2 parked in the station.
The main drive won't start without the 10 kV feeder from the Xinhua Road substation. They say its fuse blew.
Operator key: control desk, top drawer, under the logbook.
The haul rope still runs to Shangxin Street. The maintenance trolley's up in the tower.` },
];

export const docById = new Map(DOCS.map(d => [d.id, d]));
