import { useState, useRef, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import yellowStyle from './style/yellow.json';
import blackStyle from './style/black.json';
import blueStyle from './style/blue.json';
import { TrunkLine } from './TrunkLine';
import useEventProxy from './useEventProxy';
import SVGLayer from './SVGLayer';
yellowStyle.sources.world.tiles[0] = `http://${location.hostname}:${location.port}/gantry/tiles/{z}/{x}/{y}.pbf`;
blackStyle.sources.world.tiles[0] = `http://${location.hostname}:${location.port}/gantry/tiles/{z}/{x}/{y}.pbf`;
blueStyle.sources.world.tiles[0] = `http://${location.hostname}:${location.port}/gantry/tiles/{z}/{x}/{y}.pbf`;
export default (props) => {
	const {height, path} = props;
    const container = useRef();
	const eventHandle = useRef();
	const mapboxMap = useRef();
	const svgRef = useRef();
	const [map, setMap] = useState();
	const [zoom, setZoom] = useState(7);
	const [trunkLineLayer, setTrunkLineLayer] = useState();

    useEffect(() => {
        const map = new mapboxgl.Map({
            container: container.current,
            style: blueStyle, // stylesheet location
			zoom: 7,
			antialias: true,
			maxZoom: 22,
			minZoom: 2,
			height: height,
            center: [120.622088, 30.878781]
        });
		window.instanceMap = map;

		map.on('load', ()=>{
			const trunkLineLayer = new TrunkLine();
			map.trunkLineLayer = trunkLineLayer;
			map.addLayer(trunkLineLayer, 'china_provincepoint');
			trunkLineLayer.onLoad = ()=>{
				setTrunkLineLayer(trunkLineLayer);
			};
		});
		map.on('move', (e)=>{
			setZoom(map.getZoom());
			svgRef.current.changeMap();
		});
		mapboxMap.current = map;
		setMap(map);
		const canvas = map.getCanvasContainer();
		const dispose = useEventProxy(eventHandle.current, canvas);

		return ()=>{
			trunkLineLayer && trunkLineLayer.dispose();
			map.remove();
			dispose();
		};
    }, []);

	useEffect(()=>{
		if (path && map && trunkLineLayer) {trunkLineLayer.setPaths(path);}
	}, [path, trunkLineLayer]);

    return (
        <div
            className="map-can"
            style={{ width: '100%', overflow: 'hidden', position: 'relative', height: '100%' }}
            ref={eventHandle}
        >
            <div
                style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    width: '100%',
                    height: height || '100%'
                }}
                ref={container}
            ></div>
            <SVGLayer {...props} zoom={zoom} ref={svgRef} mapbox={map} />
        </div>
    );
};
