// What Anna says when she's scanned something (M5-04, DESIGN section 12): an item's uses in both languages, and what
// each kind of machine is and does.
import type { UnitKind } from './units';

/** Each item use, as she puts it. */
export const USE: Record<string, [string, string]> = {
  'aerial-map': ['航拍地图', 'aerial map'], 'beat-thermal': ['躲过热成像', 'beats thermal sight'], 'blast-door': ['炸开防爆门', 'blasts a blast door'],
  'blind-sensors': ['让传感器失明', 'blinds sensors'], 'boat-battery': ['船的电瓶', "a boat's battery"], 'boat-fuel': ['船的燃料', "a boat's fuel"],
  breach: ['破门', 'breaches a door'], 'breach-lock': ['打烂锁', 'breaks a lock'], 'breathe-gas': ['在毒气里呼吸', 'breathing in gas'],
  'breathe-underwater': ['水下呼吸', 'breathing underwater'], 'camera-feed': ['看摄像头画面', "a camera's feed"], 'camera-loop': ['让摄像头循环播放', 'loops a camera'],
  'climb-grapple': ['抓钩攀爬', 'grapple climbing'], 'clone-card': ['复制门卡', 'clones a keycard'], 'cut-bars': ['切断铁栏', 'cuts bars'],
  'cut-bolt': ['剪断插销', 'cuts a bolt'], 'cut-cable': ['剪断电缆', 'cuts a cable'], 'cut-chain': ['剪断铁链', 'cuts a chain'],
  'cut-fence': ['剪开铁丝网', 'cuts a fence'], 'cut-rope': ['割断绳子', 'cuts rope'], 'damage-robots': ['伤机器', 'damages machines'],
  decoy: ['诱饵', 'a decoy'], 'drone-routes': ['无人机航线', 'drone routes'], 'drop-noise': ['扔下去出声', 'dropped for a noise'],
  'emp-blast': ['电磁脉冲', 'an EMP blast'], 'emp-trap': ['电磁陷阱', 'an EMP trap'], fill: ['装水', 'filled with water'],
  'find-tag': ['找追踪器', 'finds tracking tags'], 'first-aid': ['急救', 'first aid'], 'fixed-line': ['固定绳', 'a fixed line'],
  'fly-drone': ['飞无人机', 'flies a drone'], 'generator-fuel': ['发电机燃料', 'generator fuel'], grip: ['防滑抓握', 'a sure grip'],
  hotwire: ['短接点火', 'hotwires'], insulate: ['保温', 'keeps warm'], jam: ['干扰信号', 'jams signals'], 'jammer-part': ['干扰器零件', 'a jammer part'],
  'ladder-bridge': ['搭桥', 'bridges a gap'], 'ladder-wall': ['爬墙', 'climbs a wall'], light: ['照明', 'light'], 'make-bench': ['做工作台', 'makes a workbench'],
  melee: ['近战', 'close fighting'], painkill: ['止痛', 'kills pain'], 'patrol-log': ['记巡逻', 'logs patrols'], 'pick-lock': ['撬锁', 'picks locks'],
  'pick-padlock': ['撬挂锁', 'picks padlocks'], 'pin-door': ['钉死门', 'nails a door shut'], 'pistol-mod': ['手枪配件', 'a pistol attachment'],
  'place-bed': ['铺床', 'a bed to lay down'], 'place-crate': ['放箱子', 'a crate to set down'], 'power-device': ['给设备供电', 'powers devices'],
  pry: ['撬开', 'prises things open'], 'pull-down': ['拉下来', 'pulls things down'], purify: ['净水', 'purifies water'], 'put-out-fire': ['灭火', 'puts out fire'],
  rappel: ['速降', 'rappelling'], salvage: ['拆机器', 'takes machines apart'], 'read-badge': ['读工牌', 'reads badges'], 'read-dark': ['黑暗中看', 'reading in the dark'], 'read-ecu': ['读车载电脑', "reads a vehicle's computer"],
  'refill-chalk': ['补镁粉', 'refills chalk'], 'ride-haul-rope': ['顺着缆绳滑', 'rides a haul rope'], 'scare-delivery': ['吓跑配送机器人', 'scares delivery robots'],
  'scooter-battery': ['电动车电池', 'a scooter battery'], 'shelter-power': ['给藏身处供电', 'powers a hideout'], shoot: ['射击', 'shooting'],
  'shoot-quiet': ['安静射击', 'quiet shooting'], 'shoot-sensor': ['射坏传感器', 'shoots out sensors'], smoke: ['烟雾', 'smoke'], splint: ['夹板', 'splints'],
  'stop-heavy-bleed': ['止大出血', 'stops heavy bleeding'], 'stop-light-bleed': ['止小出血', 'stops light bleeding'], takedown: ['偷袭', 'takedowns'],
  'throw-noise': ['扔出去出声', 'thrown for a noise'], 'trolley-part': ['滑轮零件', 'a trolley part'], 'warm-up': ['取暖', 'warms you'], zipline: ['溜索', 'ziplines'], zoom: ['望远', 'looks far'],
};

/** Each kind of machine: what it is and what to know, as she puts it. */
export const UNIT_SCAN: Record<UnitKind, [string, string]> = {
  quadruped: ['四足机器人。追得快，上楼梯，跳一米。头是它的眼睛，打头它就瞎了。', 'A quadruped. Fast, takes stairs, jumps a metre. Its head is its eyes: shoot it there and it goes blind.'],
  humanoid: ['人形机器人。有步枪，有装甲。打头最有效，背后的电池也是弱点。', 'A humanoid. Rifle, armour. Head shots work best; the battery on its back is weak too.'],
  heavy: ['重型机甲。装甲太厚，只走大街。别跟它正面打。', 'A heavy walker. Armour too thick to fight head on; it keeps to the main streets.'],
  drone: ['巡逻无人机。慢，在看。一枪打旋翼就掉。', "A patrol drone. Slow, watching. One shot to a rotor brings it down."],
  hunter: ['猎杀无人机。有冲锋枪，从停机坪起飞。打旋翼。', 'A hunter drone. Submachine gun, launched from the docks. Go for the rotors.'],
  fpv: ['自杀无人机。冲过来就炸。听到它就跑，或者打下来。', 'A strike drone. It dives and blows up. When you hear it, run, or shoot it down.'],
  bomber: ['投弹无人机。从上面扔手榴弹。别待在开阔地。', 'A bomb drone. It drops grenades from above. Stay out of the open.'],
  spider: ['蛛形机甲。巨大。顶上的传感器是弱点，但最好躲开。', 'A spider walker. Huge. The sensor cluster on top is weak, but better to keep away.'],
  colossus: ['巨型机甲。九米高。头是弱点。别让它看到你。', "A colossus. Nine metres tall. Its head is the weak spot. Don't let it see you."],
  heli: ['运兵直升机。放下一队机器搜楼。打旋翼能打下来。', 'A troop helicopter. It drops a squad to sweep a building. Its rotors can be shot out.'],
  crawler: ['蛛形无人机。住在下水道，爬墙爬顶。近了很危险。', 'A crawler. Lives in the sewers, climbs walls and roofs. Dangerous up close.'],
  delivery: ['配送机器人。只走平路，看得近。大声响会把它吓跑。', 'A delivery robot. Flat streets only, short-sighted. A loud noise scares it off.'],
  carrier: ['运输机器人。慢，载重。', 'A carrier. Slow, hauling loads.'],
  camera: ['监控摄像头。连着网络。一枪就坏。', 'A security camera. On the network. One shot breaks it.'],
  sweeper: ['旋转摄像头。来回扫。等它转开再走。', "A sweeping camera. It pans to and fro: move when it's looking away."],
  lamppost: ['智慧灯杆。摄像头和喇叭。一枪能打坏摄像头。', 'A smart lamppost. Camera and speaker. One shot breaks the camera.'],
  turret: ['自动炮塔。看到就打。正面打它的传感器。', 'A turret. It fires on sight. Hit its sensor from the front.'],
  pir: ['红外感应器。感应动作。爬着能过。', 'A motion sensor. It feels movement: crawl past it.'],
  tripwire: ['激光绊线。碰到就报警。跨过去或爬过去。', 'A laser tripwire. Break it and it raises the alarm. Step or crawl past.'],
  acoustic: ['声学传感器。在听。走慢点，别出声。', "An acoustic sensor. It's listening. Go slowly, quietly."],
};

/** A machine's parts, for her weak-point diagrams (M5-12), and what breaking each does (by BREAKS' keys). */
export const PARTS: Record<string, [string, string]> = {
  body: ['机身', 'body'], head: ['头部传感器', 'sensor head'], legs: ['腿', 'legs'], kneeL: ['左膝', 'left knee'], kneeR: ['右膝', 'right knee'], battery: ['电池', 'battery'],
  launcher: ['发射器', 'tag launcher'], rifle: ['步枪', 'rifle'], rotors: ['旋翼', 'rotors'], barrels: ['炮管', 'barrels'],
};
export const BREAK_OF: Record<string, 'head' | 'knee' | 'battery' | 'weapon' | 'rotors'> = { head: 'head', kneeL: 'knee', kneeR: 'knee', battery: 'battery', launcher: 'weapon', rifle: 'weapon', barrels: 'weapon', rotors: 'rotors' };
export const BROKEN: Record<'head' | 'knee' | 'battery' | 'weapon' | 'rotors', [string, string]> = {
  head: ['瞎了', 'blinds it'], knee: ['瘸了', 'lames it'], battery: ['关机', 'shuts it down'], weapon: ['缴械', 'disarms it'], rotors: ['坠落', 'brings it down'],
};

