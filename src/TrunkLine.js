import service from './SVGLayer/service';
import mapboxgl from 'mapbox-gl';
import * as THREE from 'three';
import RoundLine from './RoundLine';

window.THREE = THREE;
window.mapboxgl = mapboxgl;
export class TrunkLine {
    constructor() {
        this.id = 'highlight';
        this.type = 'custom';
		this.renderingMode = '2d';
		this.paths = [];
		this.markers = [];
		this.pixelRatio = window.devicePixelRatio ;
    }

    onAdd(map, gl) {
        this.camera = new THREE.Camera();
        this.scene = new THREE.Scene();

        this.map = map;

        // use the Mapbox GL JS map canvas for three.js
        this.renderer = new THREE.WebGLRenderer({
            canvas: map.getCanvas(),
            context: gl
		});
        this.getMapLocation();
        this.renderer.autoClear = false;
	}

	dispose() {
		this.scene.children.map(item=>{
			item.geometry && item.geometry.dispose();
			item.material && item.material.dispose();
		});
		this.scene.dispose();
	}

    render(gl, matrix) {
        var m = new THREE.Matrix4().fromArray(matrix);
        this.camera.projectionMatrix = m;
        this.renderer.state.reset();
        this.renderer.render(this.scene, this.camera);
	}

	addMarker(path) {
		const start = path[0];
		const end = path[path.length - 1];
		const startMarker = new mapboxgl.Marker({
			anchor: 'bottom',
			offset: [0, 13],
			element: this.makeMarkerEle('start')
		}).setLngLat([start.longitude, start.latitude]).addTo(this.map);
		const endMarker = new mapboxgl.Marker({
			anchor: 'bottom',
			offset: [0, 13],
			element: this.makeMarkerEle('end')
		}).setLngLat([ end.longitude, end.latitude]).addTo(this.map);
		this.markers.push(startMarker, endMarker);
	}

	makeMarkerEle(name) {
		const marker = document.createElement('div');
		marker.className = name;
		return marker;
	}

	setPath(path) {
		if (path.length < 2) {
			return;
		}
		const points = [];
		path = path.filter(item=>item.longitude && item.latitude);
		this.addMarker(path);
		let splitIndex = 0;
		path.find((item, index)=>{
			if (item.isSpilt) {
				splitIndex = index;
				return true;
			}
		});
		path.forEach(item=>{
			const position = mapboxgl.MercatorCoordinate.fromLngLat({
				lat: parseFloat(item.latitude),
				lng: parseFloat(item.longitude)
			});
			points.push(new THREE.Vector3(
				position.x,
				position.y,
				10 * position.meterInMercatorCoordinateUnits()
			));
		});
		const path1 = points.slice(0, splitIndex);
		const path2 = points.slice(splitIndex, path.length);
		if (path1.length > 1) {
			this.renderPath(path1);
		}
		if (path2.length > 1) {
			this.renderPath(path2);
		}
	}

	renderPath(points) {
		const canvas = this.map.getCanvas();
		const line = new RoundLine();
		line.init(points, {
			color: '#119933',
			offset: 0,
			width: 6 * this.pixelRatio,
			resolution: new THREE.Vector2(canvas.width, canvas.height)
		});
		this.scene.add(line);
		const line2 = new RoundLine();
		line2.init(points, {
			color: '#00ff33',
			offset: 0,
			width: 4 * this.pixelRatio,
			resolution: new THREE.Vector2(canvas.width, canvas.height)
		});
		this.scene.add(line2);
		this.paths.push(line, line2);
	}

	setPaths(paths) {
		this.paths.forEach(item=>{
			this.scene.remove(item);
			item.dispose();
		});
		this.markers.forEach(item=>{
			item.remove();
		});
		this.markers = [];
		this.paths = [];
		const lls = [];
		paths.forEach(item=>{
			lls.push(...item);
			this.setPath(item);
		});
		if (lls.length < 2) {
			this.map.fitBounds([[120, 29], [121, 31]], {
				linear: true,
				padding: 40
			});
			return;
		}
		const min = [Infinity, Infinity];
		const max = [-Infinity, -Infinity];
		lls.forEach(item=>{
			if (item.longitude > max[0]) {
				max[0] = item.longitude;
			}
			if (item.latitude > max[1]) {
				max[1] = item.latitude;
			}
			if (item.longitude < min[0]) {
				min[0] = item.longitude;
			}
			if (item.latitude < min[1]) {
				min[1] = item.latitude;
			}
		});
		this.map.fitBounds([min, max], {
			maxZoom: 12,
			linear: true,
			padding: 40
		});
	}

	initRoads() {
		const canvas = this.map.getCanvas();
        for (let key in this.mapData) {
            const points = [];
            this.mapData[key].forEach((item) => {
                if (item.longitude && item.latitude) {
                    const position = mapboxgl.MercatorCoordinate.fromLngLat({
                        lat: parseFloat(item.latitude),
                        lng: parseFloat(item.longitude)
                    });
                    points.push(
                        new THREE.Vector3(
                            position.x,
                            position.y,
                            9 * position.meterInMercatorCoordinateUnits()
                        )
                    );
                }
			});
            if (points.length < 2) {
                continue;
			}
			const line = new RoundLine();
			const width = 2;
			line.init(points, {
				width: width * this.pixelRatio,
				offset: this.pixelRatio * (width / 2 + 2),
				resolution: new THREE.Vector2(canvas.width, canvas.height)
			});
			this.scene.add(line);
			const line2 = new RoundLine();
			line2.init(points, {
				width: width * this.pixelRatio,
				offset: -this.pixelRatio * (width / 2 + 2),
				resolution: new THREE.Vector2(canvas.width, canvas.height)
			});
			this.scene.add(line2);

		}
		this.onLoad && this.onLoad();
	}

    async getMapLocation() {
        const res = await service.get('/base/road/site/location');
        const mapData = {};
        const sitesMap = {};
        res.forEach((item) => {
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
            mapData[item.roadName].push(item);
            mapData[item.roadName] = mapData[item.roadName].sort((a, b) => {
                return parseInt(a.siteSeq, 10) < parseInt(b.siteSeq, 10)
                    ? 1
                    : -1;
            });
        });

        // 合并路
        this.mapData = {
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
        };
       this.initRoads();
	}

}
