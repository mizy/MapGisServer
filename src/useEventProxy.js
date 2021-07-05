export default (dom, target)=>{
	const events = [
		'mousedown',
		'mouseup',
		'click',
		'dblclick',
		'mousemove',
		'mouseover',
		'mouseenter',
		'mouseleave',
		'mouseout',
		'mousewheel',
		'wheel',
		'contextmenu',
		'touchstart',
		'touchend',
		'touchmove',
		'touchenter',
		'touchleave',
		'touchcancel'
	];
	const handleEvent = (e)=> {
		e.preventDefault();
		if (e.byMe) {return;}
		let newEvent;
		if (event.type.indexOf('touch') > -1) {
			const touches = [];
			for (const touch of e.touches) {
				const {identifier, clientX, clientY, screenX, screenY, pageX, pageY, radiusX, radiusY, rotationAngle, force} = touch;
				touches.push(new Touch({identifier, clientX, clientY, screenX, screenY, pageX, pageY, radiusX, radiusY, rotationAngle, force, target: target}));
			};
			newEvent = new TouchEvent(e.type, {...e, touches});
		} else {
			const {deltaX, deltaY} = e;
			newEvent = new MouseEvent(e.type, e);
			newEvent.deltaX = deltaX;
			newEvent.deltaY = deltaY;
		}
		newEvent.byMe = true;
		newEvent.initEvent(e.type, true, false);
		target.dispatchEvent(newEvent);
	};

	events.forEach(event=>{
		dom.addEventListener(event, handleEvent);
	});
	return () => {
		events.forEach(event=>{
			dom.removeEventListener(event, handleEvent);
		});
	};
};
