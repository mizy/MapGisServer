import { PureComponent, Fragment } from 'react';
import './index.less';
import service from './service';
let textData = require('./texts.json');
const roadNames = require('./roadName.json');

// props.lineData
class Map extends PureComponent {
	state = {
		mapRoadColors: {},
		preMinute: 0,
		refreshSecond: 30
	};

	colorMap = {
		'5': [0.6, 0.4],
		'15': [0.5, 0.5],
		'30': [0.45, 0.55],
		'60': [0.4, 0.6],
		'120': [0.3, 0.7]
	};

	constructor(props) {
		super(props);
	}

	async getMapLocation() {
		const res = await service.get('/base/road/site/location');
		this.setState({
			res
		}, ()=>{
			this.formatRes();
		});
	}

	formatRes() {
		const {res} = this.state;
		const mapData = {};
		const sitesMap = {};
		res.forEach(item => {
			if (!item.siteNo) item.siteNo = item.siteName;
			if (!mapData[item.roadName]) {
				mapData[item.roadName] = [];
			}
			if (item.siteNo.indexOf('|') > -1) {
				const nos = item.siteNo.split('|');
				sitesMap[nos[0]] = item;
				sitesMap[nos[1]] = item;
			} else {
				sitesMap[item.siteNo] = item;
			}
			mapData[item.roadName].push({
				...this.convertCoord(item),
				...item
			});
			mapData[item.roadName] = mapData[item.roadName].sort((a, b) => {
				return parseInt(a.siteSeq, 10) < parseInt(b.siteSeq, 10)
					? 1
					: -1;
			});
		});
		window.sitesMap = sitesMap;

		// 合并路
		this.setState({
			mapData: {
				G9211_1: mapData['2927'],
				G1523: mapData['1205'],
				S45: mapData['1704'],
				G1512: mapData['1703'],

				G56: mapData['200X'],
				G50: mapData['2101'],
				G9211: mapData['2901'],
				S13: mapData['320X'],
				S9: mapData['4003'],
				G1522: mapData['1601'],
				G15: mapData['120X'],
				S28: mapData['1801'],
				G1301: mapData['1301'],
				'g92-s2-g60': [
					...mapData['S5'],
					...mapData['G92'],
					...mapData['S2'],
					...mapData['G60']
				]

			},
			sitesMap
		});
	}

	changeMap() {
		const {mapData} = this.state;
		for (let key in mapData) {
			mapData[key].forEach(item=>{
				const pos = this.convertCoord(item);
				item.x = pos.x;
				item.y = pos.y;
			});
		}
		this.setState({mapData: {...mapData}});
	}

	normalize({ x, y }) {
		const l = Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2));
		return {
			x: l ? x / l : 1,
			y: l ? y / l : 1
		};
	}

	onDrag(e, item) {
		if (!item || !e) return;
		if (!textData[item.siteName]) textData[item.siteName] = item;
		e.preventDefault();
		if (e.button === 2) {
			textData[item.siteName].mode =
				textData[item.siteName].mode === 'nowrap'
					? 'pre-wrap'
					: 'nowrap';
			e.target.style.whiteSpace = textData[item.siteName].mode;

			return false;
		}
		const mousemove = () => {
			let x = window.event.pageX - 418;
			let y = window.event.pageY - 185;
			e.target.style.left = x + 'px';
			e.target.style.top = y + 'px';
			textData[item.siteName].x = x;
			textData[item.siteName].y = y;
			window.tdata = textData;
		};

		const mouseup = () => {
			window.removeEventListener('mouseup', mouseup);
			window.removeEventListener('mousemove', mousemove);
		};
		window.addEventListener('mouseup', mouseup);
		window.addEventListener('mousemove', mousemove);
	}

	// 根据距离生成两边的线
	makeDoublePath(data, dis) {
		const path1 = [];
		const path2 = [];
		for (let i = 0; i < data.length; i++) {
			// 起止
			let point0, point1, point2;
			if (i === data.length - 1) {
				// 末尾
				point0 = data[i - 1];
				point1 = data[i];
				point2 = {
					x: 2 * point1.x - point0.x,
					y: 2 * point1.y - point0.y
				};
			} else if (i === 0) {
				point1 = data[i];
				point2 = data[i + 1];
				point0 = {
					x: 2 * point1.x - point2.x,
					y: 2 * point1.y - point2.y
				};
			} else {
				point0 = data[i - 1];
				point1 = data[i];
				point2 = data[i + 1];
			}
			const point0_1 = this.normalize({
				x: point1.x - point0.x,
				y: point1.y - point0.y
			});
			const point2_1 = this.normalize({
				x: point2.x - point1.x,
				y: point2.y - point1.y
			});
			const point2_1_0 = {
				x: point2_1.x + point0_1.x,
				y: point2_1.y + point0_1.y
			};
			const point2_1_0V = this.normalize({
				x: -point2_1_0.y,
				y: point2_1_0.x
			});
			// 拐角处的宽度是待角度的宽度，需要换算成直线的宽度，中间求比例sin值
			const ratio = Math.sqrt(1.0 - Math.pow((point0_1.x * point2_1_0V.x + point0_1.y * point2_1_0V.y), 2.0));
			if (isNaN(point2_1_0V.x) || isNaN(point2_1_0V.y) || isNaN(ratio)) {
				console.log('BugDataSurround:', data[i]);
				continue;
			}
			path1.push({
				x: point2_1_0V.x * dis / ratio + point1.x,
				y: point2_1_0V.y * dis / ratio + point1.y
			});
			path2.push({
				x: -point2_1_0V.x * dis / ratio + point1.x,
				y: -point2_1_0V.y * dis / ratio + point1.y
			});
		}

		return [path1, path2];
	}

	// 坐标转换
	convertCoord(item) {
		if (!item) {
			console.warn('发现无数据站点', item);
			return { x: 0, y: 0 };
		}
		const lon = item.lon || item.longitude;
		const lat = item.lat || item.latitude;
		const {mapbox} = this.props;
		const {x, y} = mapbox.project([ lon, lat]);
		return { ...item, x, y };
	}

	randomColor() {
		const colors = [
			'url(#linear0)',
			'url(#linear1)',
			'url(#linear2)',
			'url(#linear3)',
			'url(#linear4)'
		];
		return colors[Math.floor(Math.random() * 5)];
	}

	onClickRoad(data1, data2, rank) {
		console.log(data1, data2, rank);
	}

	componentDidUpdate(prevProps) { }

	// 生成路径
	makePath(data, roadId) {
		const colors = [
			'url(#linear0)',
			'url(#linear1)',
			'url(#linear2)',
			'url(#linear3)',
			'url(#linear4)'
		];
		const { mapRoadColors = {} } = this.state;
		const key = data.roadName;
		let path1 = '';
		let path = '';
		let path2 = '';
		const circles = [];
		const [pathData1, pathData2] = this.makeDoublePath(data, 4);
		const paths1 = [];
		const paths2 = [];
		for (let i = 0; i < data.length; i++) {
			if (i < data.length - 1) {
				const starts = data[i].siteNo.split('|');
				const startName0 = starts[0];
				const startName1 = starts[1] || starts[0];
				const ends = data[i + 1].siteNo.split('|');
				const endName0 = ends[0];
				const endName1 = ends[1] || ends[0];
				const startColor = mapRoadColors[`${startName0}_${endName0}`] || mapRoadColors[`${startName0}_${endName1}`] || mapRoadColors[`${startName1}_${endName0}`] || mapRoadColors[`${startName1}_${endName1}`];
				const endColor = mapRoadColors[`${endName0}_${startName0}`] || mapRoadColors[`${endName1}_${startName0}`] || mapRoadColors[`${endName0}_${startName1}`] || mapRoadColors[`${endName1}_${startName1}`];

				paths1.push(
					<path
						onClick={() => {
							this.onClickRoad(data[i], data[i + 1], 0);
						}}
						fill="none"
						d={`M${pathData1[i].x} ${pathData1[i].y} L${pathData1[i + 1].x} ${pathData1[i + 1].y}`}
						id={key}
						key={key}
						stroke={
							(colors[startColor] || 'rgb(1,128,141)')
						}
						strokeWidth={4}
					/>
				);
				paths2.push(
					<path
						onClick={() => {
							this.onClickRoad(data[i + 1], data[i], 1);
						}}
						fill="none"
						d={`M${pathData2[i].x} ${pathData2[i].y} L${pathData2[i + 1].x} ${pathData2[i + 1].y}`}
						id={key}
						key={key}
						stroke={
							(colors[endColor] || 'rgb(1,128,141)')
						}
						strokeWidth={4}
					/>
				);
			}
			if (i === 0) {
				path += `M${data[i].x} ${data[i].y} `;
				path1 += `M${pathData1[i].x} ${pathData1[i].y} `;
				path2 += `M${pathData2[i].x} ${pathData2[i].y} `;
			} else {
				path += ` L${data[i].x} ${data[i].y} `;
				path1 += `L${pathData1[i].x} ${pathData1[i].y} `;
				path2 += `L${pathData2[i].x} ${pathData2[i].y} `;
			}
			circles.push(
				<circle
					data-name={data[i].siteName}
					cx={pathData1[i].x}
					cy={pathData1[i].y}
					r="1.5"
					fill="#fff"
				/>
			);
			circles.push(
				<circle
					data-name={data[i].siteName}
					cx={pathData2[i].x}
					cy={pathData2[i].y}
					r="1.5"
					fill="#fff"
				/>
			);
		}

		return (
			<g key={roadId}>
				<path
					fill="none"
					d={path1}
					id={key}
					key={key}
					stroke="hsl(216, 36%, 16%)"
					strokeWidth={6}
				/>
				<path
					fill="none"
					d={path2}
					id={key}
					key={key}
					stroke="hsl(216, 36%, 16%)"
					strokeWidth={6}
				/>
			</g>
		);
	}

	makeLine() {
		const {lineData} = this.props;
		this.nowPoints = [];
		if (!lineData || lineData.length <= 1) return null;
		const positions = lineData.map(item=>{
			return this.convertCoord(item);
		});
		let splitIndex = positions.length;
		positions.find((item, index)=>{
			if (item.isSpilt) {
				splitIndex = index;
				return true;
			}
		});
		const path1 = positions.slice(0, splitIndex);
		const path2 = positions.slice(splitIndex, positions.length);
		// 使用两条线覆盖，不要计算出多边形的两边点
		// const [path1, path2] = this.makeDoublePath(positions, 5);
		// const paths = [...path1, ...path2.reverse()];

		let d = '';
		path1.forEach((data, i)=>{
			if (i === 0) {
				d += `M${data.x} ${data.y} `;
			} else {
				d += ` L${data.x} ${data.y} `;
			}
		});
		let d2 = '';
		path2.forEach((data, i)=>{
			if (i === 0) {
				d2 += `M${data.x} ${data.y} `;
			} else {
				d2 += ` L${data.x} ${data.y} `;
			}
		});
		let lineJoin = '';

		if (path2.length) {
			lineJoin = `M${path1[path1.length - 1].x} ${path1[path1.length - 1].y} L${path2[0].x} ${path2[0].y}`;
		}
		// d += `Z${paths[0].x} ${paths[1].y}`;
		return <g className="history-path">
			{/* <path d={d} stroke="#04af42" strokeWidth="1.5" strokeLinejoin="round" fill="#1cef65" /> */}
			{d && (<>
				<path d={d} stroke="#04af42" strokeWidth="12" strokeLinejoin="round" fill="transparent" />
				<path d={d} stroke="#1cef65" strokeWidth="8" strokeLinejoin="round" fill="transparent" />
			</>)}
			{lineJoin && <path d={lineJoin} stroke="#04af42" strokeWidth="12" strokeDashArray="5" strokeLinejoin="round" fill="transparent" />}
			{d2 && (<>
				<path d={d2} stroke="#04af42" strokeWidth="12" strokeLinejoin="round" fill="transparent" />
				<path d={d2} stroke="#1cef65" strokeWidth="8" strokeLinejoin="round" fill="transparent" />
			</>)}
			{this.renderLineArrow(positions)}
		</g>;
	}

	lineArrowDash = 10;

	renderLineArrow(data) {
		if (!data.length) return;
		let totalLength = 0;
		const pathLength = [];
		const arrowData = [];
		for (let i = 1 ;i < data.length;i++) {
			const now = data[i];
			const pre = data[i - 1];
			const length = Math.sqrt(Math.pow(now.x - pre.x, 2) + Math.pow(now.y - pre.y, 2));
			totalLength += length;
			pathLength.push({index: i, totalLength, length});
		}
		// 总个数
		if (isNaN(totalLength)) return;
		for (let i = 0, j = 1;i < pathLength.length;i++) {
			const {index, length, totalLength} = pathLength[i];
			const path1Point = data[index];
			const path0Point = data[index - 1];
			for (;;j++) {
				const nowLength = j * this.lineArrowDash;
				if (nowLength > totalLength || !totalLength) break;
				const restLength = nowLength - (pathLength[index - 2] ? pathLength[index - 2].totalLength : 0);
				const ratio = restLength / length;
				const x = (path1Point.x - path0Point.x) * ratio + path0Point.x;
				const y = (path1Point.y - path0Point.y) * ratio + path0Point.y;
				// matrix = [0,tany/sqrt(d),tanx/sqrt(d),0,x,y];//先旋转再平移
				const angle = Math.atan((path1Point.y - path0Point.y) / (path1Point.x - path0Point.x)) * 180 / Math.PI - 90 + this.converAngle(path1Point.y - path0Point.y, path1Point.x - path0Point.x);
				arrowData.push({
					x, y, angle
				});
			}
		}
		// 缓存备用
		this.data = data;
		this.totalLength = length;
		this.pathLength = pathLength;
		this.arrowData = arrowData;
		return <g className="line-arrows">
			{arrowData.map((item, index)=>{
				const {x, y, angle} = item;
				return <use key={index} xlinkHref="#line-arrow" width={5} transform={`rotate(${angle},${x},${y})`} height={5} x={x - 2.5} y={y} />;
			})}
		</g>;
	}

	// 根据比例获取当前点的坐标
	getCoordAt(ratio) {
		const {pathLength = [], data, arrowData = []} = this;
		const nowLength = this.totalLength * ratio;
		let coord;
		for (let i = 0;i < pathLength.length;i++) {
			const {index, length, totalLength} = pathLength[i];
			const path1Point = data[index];
			const path0Point = data[index - 1];
			if (nowLength > totalLength) continue;
			const restLength = nowLength - (pathLength[index - 2] ? pathLength[index - 2].totalLength : 0);
			const ratio = restLength / length;
			const x = (path1Point.x - path0Point.x) * ratio + path0Point.x;
			const y = (path1Point.y - path0Point.y) * ratio + path0Point.y;
			const angle = Math.atan((path1Point.y - path0Point.y) / (path1Point.x - path0Point.x)) * 180 / Math.PI - 90;
			coord = {
				x, y, angle
			};
			break;
		}
		return coord;
	}

	// 补偿角度
	converAngle(y, x) {
		if (x > 0) {
			return 180;
		}
		return 0;
	}

	makeHeadArrow=()=>{
		const {lineData = []} = this.props;
		if (!lineData || lineData.length < 2) return null;
		const positions = lineData.map(item=>{
			return this.convertCoord(item);
		});
		const length = positions.length;
		const startAngle = Math.atan((positions[1].y - positions[0].y) / (positions[1].x - positions[0].x)) * 180 / Math.PI - 45 + this.converAngle(positions[1].y - positions[0].y, positions[1].x - positions[0].x);
		const head = <div style={{transform: `rotate(${startAngle}deg)`, left: positions[0].x, top: positions[0].y}} className="head-point">
			<div></div>
			<div></div>
			{/* <div></div> */}
		</div>;
		const endAngle = Math.atan((positions[length - 1].y - positions[length - 2].y) / (positions[length - 1].x - positions[length - 2].x)) * 180 / Math.PI - 45 + this.converAngle(positions[length - 1].y - positions[length - 2].y, positions[length - 1].x - positions[length - 2].x);
		const tailLeft = positions[length - 1].x;
		const tailTop = positions[length - 1].y;
		const tail = <div style={{transform: `rotate(${endAngle}deg)`, left: tailLeft, top: tailTop}} className="head-point">
			<div></div>
			<div></div>
			{/* <div></div> */}
		</div>;
		const headP = <div className="head-p" >
			<div className="time-info">始发</div>
			<h3>{this.props.enName}</h3>
		</div>;
		const tailP = <div className="tail-p" >
			<div className="time-info">到达</div>
			<h3>{this.props.outName}</h3>
		</div>;
		return [head, tail, headP, tailP];
	}

	makePoint() {
		let {pointData = []} = this.props;
		const positions = pointData.map(item=>{
			return this.convertCoord(item);
		});
		const pointsDom = positions.map((item, index)=>{
			return <div key={index} style={{left: item.x, top: item.y }} className="live-point">
				<div></div>
				<div></div>
			</div>;
		});
		return pointsDom;
	}

	convertTextXY({x, y}) {
		const width = 1163;
		const height = 910;
		const lats = [27.9, 31.18];
		const lngs = [118.02, 122.93];
		const eachLat = height / (lats[1] - lats[0]);
		const eachLng = width / (lngs[1] - lngs[0]);
		const lon = x / eachLng + lngs[0];
		const lat = (height - y) / eachLat + lats[0];
		return this.convertCoord({lon, lat});
	}

	makeText() {
		if (this.props.zoom < 8) return false;
		const { mapData = [] } = this.state;
		const texts = [];
		for (let key in mapData) {
			const eachData = mapData[key] || [];
			eachData.forEach((item, index) => {
				const isCenter = item.siteName.indexOf('枢纽') > -1;
				const name = item.siteName.split('枢纽')[0];
				const data = textData[item.siteName] || item;
				const {x, y} = this.convertCoord(data);

				texts.push(
					<div
						key={key + index}
						className={`text-name ${isCenter ? 'center-name' : ''}`}
						style={{
							left: x,
							top: y,
							whiteSpace: data.mode || 'pre-wrap'
						}}
					>
						{name}
					</div>
				);
			});
		}
		return texts;
	}

	makePaths() {
		const { mapData = [] } = this.state;
		const paths = [];
		for (let key in mapData) {
			mapData[key] && paths.push(this.makePath(mapData[key], key));
		}
		return paths;
	}

	makeRoadName() {
		if (this.props.zoom < 7) {
			return null;
		}
		return roadNames.map(item => {
			const xy = this.convertCoord(item);
			return <div key={item.title} style={{ left: xy.x, top: xy.y }}>{item.title}</div>;
		});
	}

	componentDidUpdate(beforeProps) {
		if (this.props.mapbox && !beforeProps.mapbox) {
			this.getMapLocation();
		}
	}

	render() {
		if (!this.props.mapbox || this.props.zoom < 5) {
			return null;
		}
		return (
			<div
				className={'map-container mobile'}
				onContextMenu={e => {
					e.preventDefault();
					e.stopPropagation();
					return false;
				}}
			>
					<svg style={{ width: '100%', height: '100%' }}>
						<defs>
							<filter
								id="shadow"
								x="0"
								y="0"
								width="220%"
								height="220%"
							>
								<feOffset
									result="offOut"
									in="SourceAlpha"
									dx="0"
									dy="0"
								/>
								<feGaussianBlur
									result="blurOut"
									in="offOut"
									stdDeviation="5"
								/>
								<feBlend
									in="SourceGraphic"
									in2="blurOut"
									mode="normal"
								/>
							</filter>
							<symbol id="line-arrow" viewBox="-2 -2.5 4 4">
								<path stroke="#ffffff" fill="transparent" strokeWidth="1" d="M-2,0 L0,-2 L2,0" />
							</symbol>
						</defs>
						{/* {this.makePaths()} */}
						{this.makeLine()}
					</svg>
					<div className="text-group">{this.makeText()}</div>
					<div className="road-name-group">
						{this.makeRoadName()}
					</div>
					<div className="show-points">
						{this.makeHeadArrow()}
						{this.makePoint()}
					</div>
			</div>
		);
	}
}

export default Map;
