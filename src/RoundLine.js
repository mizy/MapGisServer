import * as THREE from 'three';
class RoundLine extends THREE.Group {
	init(lineData, {resolution = {x: window.innerWidth, y: window.innerHeight}, offset = 0, width = 10, color = '#f5ab4b' }) {
		this.pointMaterial = new THREE.ShaderMaterial({
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
				},
				pixelPerRatio: {
					value: 2.0 / resolution.y
				},
				opacity: {
					value: 1
				}
			},
			transparent: true,

			vertexShader: `
			precision highp float;
			attribute vec3 prev;
			attribute vec3 next;
			uniform float width;
			uniform float offset;
			uniform vec2 resolution;
			uniform float pixelPerRatio;
			void main() {
				// 屏幕比例
				float aspect = resolution.x/resolution.y;

				// 屏幕坐标
				mat4 m = projectionMatrix * modelViewMatrix;
				vec4 mPosition = m * vec4(position,1.0);
				vec4 mPrev = m * vec4(prev,1.0);
				vec4 mNext = m * vec4(next,1.0);

				// 归一化为[-1,1]区间
				vec2 mPrev2 = mPrev.xy/mPrev.w;
				vec2 mNext2 = mNext.xy/mNext.w;
				vec2 mNow2 = mPosition.xy/mPosition.w;

				// 偏移量
				if(offset!=0.){
					vec2 point21 = normalize(mNext2 - mNow2);
					vec2 point10 = normalize(mNow2 - mPrev2);
					vec2 offsetDir = normalize( point21 + point10);
					vec2 offsetNormal = vec2( -offsetDir.y, offsetDir.x);
					float ratio = sqrt(1.0 - pow(dot(offsetNormal,point10),2.0));
					vec2 offsets = pixelPerRatio * offsetNormal * offset/ratio * mPosition.w ;
					offsets.x /= aspect;
					mPosition.xy += offsets;
				}

				gl_PointSize = width;
				gl_Position = mPosition;
			}
			`,
			fragmentShader: `
			uniform float width;
			uniform float opacity;
			uniform vec3 color;
			void main() {
				float l = length(gl_PointCoord-vec2(0.5,0.5));
				float smoothSideRatio = smoothstep(0.,0.3,(0.5-l));
				gl_FragColor = vec4(color,smoothSideRatio);
			}
			`
		});
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
				},
				pixelPerRatio: {
					value: 2.0 / resolution.y
				},
				opacity: {
					value: 1
				}
			},
			transparent: true,

			vertexShader: `
			precision highp float;
			attribute vec3 prev;
			attribute vec3 next;
			attribute float side;
			attribute float status;
			uniform float width;
			uniform float offset;
			uniform vec2 resolution;
			uniform float pixelPerRatio;
			varying float vSide;
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

				// 计算线法向量,这里用status进行简化if操作
				vec2 dir = normalize(status*mPosition2 - status*mPrev2 + (1.0-status)*mNext2 - (1.0-status)*mPosition2);

				// 也可以变成(dir.y,-dir.x)
				vec2 normal = vec2( -dir.y, dir.x);

				// 记录下sdf
				vSide = side;
			
				// 像素坐标系应该还原到[-1,1]坐标系尺度上
				normal *= 0.5 * width * pixelPerRatio * mPosition.w ;

				// 偏移量
				vec2 offsets = vec2(0,0);
				if(offset!=0.){
					vec2 point21 = normalize(mNext2 - mPosition2);
					vec2 point10 = normalize(mPosition2 - mPrev2);
					vec2 offsetDir = normalize( point21 + point10);
					vec2 offsetNormal = vec2( -offsetDir.y, offsetDir.x);
					float ratio = sqrt(1.0 - pow(dot(offsetNormal,point10),2.0));
					offsets = pixelPerRatio * offsetNormal * offset/ratio * mPosition.w ;
				}
				
				// 还原
				normal.x /= aspect;
				offsets.x /= aspect;

				// /normal.x 还原回[-1,1]空间
				mPosition.xy += offsets + normal*side;
				gl_Position = mPosition;

			}
			`,
			fragmentShader: `
			varying float vSide;
			uniform float width;
			uniform vec2 resolution;
			uniform vec3 color;
			uniform float opacity;
			void main() {
				float smoothSideRatio = smoothstep(0.,0.3,(1. - abs(vSide)));
				// vec3 vColor = vec3(color.r+1.-smoothSideRatio,color.g+1.-smoothSideRatio,color.b+1.-smoothSideRatio);
				gl_FragColor = vec4(color,opacity*smoothSideRatio);
			}
			`
		});
		this.pointGeometry = new THREE.BufferGeometry();
		this.pointMesh = new THREE.Points(this.pointGeometry, this.pointMaterial);
		this.geometry = new THREE.BufferGeometry();
		this.lineMesh = new THREE.Mesh(this.geometry, this.material);
		this.formatData(lineData);

		this.add(this.pointMesh);
		this.add(this.lineMesh);
	}

	formatData(data) {
		const sides = [];
		const status = [];
		const prevs = [];
		const nexts = [];
		const positions = [];
		const indexes = [];
		const points0 = [];
		const points1 = [];
		const points2 = [];
		for (let i = 0;i < data.length - 1;i++) {
			let point1 = data[i];
			let point0 = data[i - 1] || {x: 2 * data[i].x - data[i + 1].x, y: 2 * data[i].y - data[i + 1].y, z: data[i].z};
			let point2 = data[i + 1] || {x: 2 * data[i].x - data[i - 1].x, y: 2 * data[i].y - data[i - 1].y, z: data[i].z};
			sides.push(1, -1);
			points0.push(
				point0.x, point0.y, point0.z,
				point0.x, point0.y, point0.z
			);
			points1.push(
				point1.x, point1.y, point1.z,
				point1.x, point1.y, point1.z
			);
			points2.push(
				point2.x, point2.y, point2.z,
				point2.x, point2.y, point2.z
			);
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
			const j = i + 1;
			point1 = data[j];
			point0 = data[j - 1] || {x: 2 * data[j].x - data[j + 1].x, y: 2 * data[j].y - data[j + 1].y, z: data[j].z};
			point2 = data[j + 1] || {x: 2 * data[j].x - data[j - 1].x, y: 2 * data[j].y - data[j - 1].y, z: data[j].z};
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
			status.push(0, 0, 1, 1);
		}

		for (let j = 0;j < data.length - 1;j++) {
			const n = j * 4;
			indexes.push(
				n, n + 1, n + 2,
				n + 2, n + 1, n + 3
			);
		}
		this.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
		this.geometry.setAttribute('prev', new THREE.BufferAttribute(new Float32Array(prevs), 3));
		this.geometry.setAttribute('next', new THREE.BufferAttribute(new Float32Array(nexts), 3));
		this.geometry.setAttribute('side', new THREE.BufferAttribute(new Float32Array(sides), 1));
		this.geometry.setAttribute('status', new THREE.BufferAttribute(new Float32Array(status), 1));
		// this.geometry.setAttribute('side', new THREE.BufferAttribute(new Float32Array(sides), 1));
		this.geometry.setIndex(indexes);

		this.pointGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
		this.pointGeometry.setAttribute('prev', new THREE.BufferAttribute(new Float32Array(prevs), 3));
		this.pointGeometry.setAttribute('next', new THREE.BufferAttribute(new Float32Array(nexts), 3));
	}

	normalize({ x, y }) {
		const l = Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2));
		return {
			x: l ? x / l : 1,
			y: l ? y / l : 1
		};
	}

	dispose() {
		this.material.dispose();
		this.geometry.dispose();
		this.lineMesh = null;
		this.material = null;
		this.geometry = null;
	}
}
export default RoundLine;
