import * as THREE from 'three';
class PlaneLine extends THREE.Group {
	init(lineData, {resolution = {x: window.innerWidth, y: window.innerHeight}, offset = 0, width = 10, color = '#5894cf' }) {
		this.material = new THREE.ShaderMaterial({
			uniforms: {

				offset: {
					value: offset
				},
				width: {
					value: width * window.devicePixelRatio
				},
				resolution: {
					value: resolution
				},
				color: {
					value: new THREE.Color(color)
				}
			},
			transparent: true,

			vertexShader: `
			precision highp float;
			attribute vec3 prev;
			attribute vec3 next;
			attribute float side;
			uniform float width;
			uniform float offset;
			uniform vec2 resolution;
			varying float vSide;
			varying vec2 vPosition;
			varying vec2 vCenter;
			void main() {
				// 屏幕比例
				float aspect = resolution.x/resolution.y;

				// 屏幕坐标
				mat4 m = projectionMatrix * modelViewMatrix;
				vec4 mPosition = m * vec4(position,1.0);
				vec4 mPrev = m * vec4(prev,1.0);
				vec4 mNext = m * vec4(next,1.0);

				// 归一化为[-1,1]区间
				vec2 mPosition2 = mPosition.xy/mPosition.w;
				vec2 mPrev2 = mPrev.xy/mPrev.w;
				vec2 mNext2 = mNext.xy/mNext.w;

				// 宽度进行比例放大，模拟真实视觉比例进行角度计算
				mPosition2.x *= aspect;
				mPrev2.x *= aspect;
				mNext2.x *= aspect;

				// 计算1/2夹角向量,可以取前后向量和的垂向量，也可以求前后向量的和(这样会导致直线的情况恰巧=0而bug)
				vec2 dir10 = normalize(mPosition2 - mPrev2);
				vec2 dir21 = normalize(mNext2 - mPosition2);
 				vec2 dir = normalize(dir10+dir21);

				// 也可以变成(dir.y,-dir.x)
				vec2 normal = vec2( -dir.y, dir.x);

				// 记录下sdf
				vSide = side;

				// 修正应该膨胀的宽度
				float ratio = sqrt(1.0 - pow(dot(normal,dir10),2.0));
			
				// 屏幕比例
				float pixelPerRatio = 2./resolution.y;

				// 像素坐标系应该还原到[-1,1]坐标系尺度上
				normal *= 0.5 * width/ratio * pixelPerRatio * mPosition.w ;
				
				// 偏移量
				vec2 offsets = normal*offset;

				// 还原
				normal.x /= aspect;
				offsets.x /= aspect;

				// /normal.x 还原回[-1,1]空间
				mPosition.xy += offsets;
				vec2 center = mPosition.xy/mPosition.w;
				mPosition.xy += normal*side;
				vPosition = mPosition.xy/mPosition.w;
				vCenter = vPosition - center;
				gl_Position = mPosition;

			}
			`,
			fragmentShader: `
			varying float vSide;
			varying vec2 vPosition;
			varying vec2 vCenter;
			uniform float width;
			uniform vec2 resolution;
			uniform vec3 color;
			void main() {
				float smoothSideRatio = max(0.1,smoothstep(0.,1.,(1. - abs(vSide))));
				vec3 vColor = vec3(color.r+1.-smoothSideRatio,color.g+1.-smoothSideRatio,color.b+1.-smoothSideRatio);
				gl_FragColor = vec4(color,smoothSideRatio);
			}
			`
		});
		this.geometry = new THREE.BufferGeometry();
		this.formatData(lineData);
		this.lineMesh = new THREE.Mesh(this.geometry, this.material);
		this.add(this.lineMesh);
	}

	formatData(data) {
		const sides = [];
		const prevs = [];
		const nexts = [];
		const positions = [];
		const indexes = [];
		for (let i = 0;i < data.length;i++) {
			const point1 = data[i];
			const point0 = data[i - 1] || {x: 2 * data[i].x - data[i + 1].x, y: 2 * data[i].y - data[i + 1].y, z: data[i].z};
			const point2 = data[i + 1] || {x: 2 * data[i].x - data[i - 1].x, y: 2 * data[i].y - data[i - 1].y, z: data[i].z};
			sides.push(1, -1);
			prevs.push(
				point0.x, point0.y, point0.z,
				point0.x, point0.y, point0.z
			);
			positions.push(
				point1.x, point1.y, point1.z,
				point1.x, point1.y, point1.z
			);
			nexts.push(
				point2.x, point2.y, point2.z,
				point2.x, point2.y, point2.z
			);
		}
		console.log('planeline:' + data.length);
		for (let j = 0;j < data.length - 1;j++) {
			const n = j * 2;
			indexes.push(
				n, n + 1, n + 2,
				n + 2, n + 1, n + 3
			);
		}
		console.log(indexes);
		this.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
		this.geometry.setAttribute('prev', new THREE.BufferAttribute(new Float32Array(prevs), 3));
		this.geometry.setAttribute('next', new THREE.BufferAttribute(new Float32Array(nexts), 3));
		this.geometry.setAttribute('side', new THREE.BufferAttribute(new Float32Array(sides), 1));
		// this.geometry.setAttribute('side', new THREE.BufferAttribute(new Float32Array(sides), 1));
		this.geometry.setIndex(indexes);
	}

	normalize({ x, y }) {
		const l = Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2));
		return {
			x: l ? x / l : 1,
			y: l ? y / l : 1
		};
	}

	destroy() {
		this.material.dispose();
		this.geometry.dispose();
		this.lineMesh = null;
		this.material = null;
		this.geometry = null;
	}
}
export default PlaneLine;
