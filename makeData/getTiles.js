const fs = require("fs");
const http = require("http");
const path = require("path");
const got = require("got");
const files = fs.readdirSync(path.join(__dirname,'../cache/world'));
files.forEach(z=>{
	fs.mkdirSync(path.join(__dirname,`./${z}`),{recursive:true});
	const xs = fs.readdirSync(path.join(__dirname,`../cache/world/${z}`));
	xs.forEach(x=>{
		fs.mkdirSync(path.join(__dirname,`./${z}/${x}`),{recursive:true});
		const ys = fs.readdirSync(path.join(__dirname,`../cache/world/${z}/${x}`));
		ys.forEach(y=>{
			 saveTiles(x,y,z);
		})
	})

})
function saveTiles(x,y,z){
	const url = `http://localhost:18082/maps/world/${z}/${x}/${y}.pbf`;
	console.log(url);
	let httpStream = got.stream(url);

	const writeStream = fs.createWriteStream(path.join(__dirname,`./${z}/${x}/${y}.pbf`));
	httpStream.pipe(writeStream);
}
function deg2num(lat_deg, lon_deg, zoom){
	const lat_rad = lat_deg*Math.PI/180
    const n = Math.pow(2.0 , zoom);
    const xtile = parseInt((lon_deg + 180.0) / 360.0 * n)
    const ytile = parseInt((1.0 - Math.log(Math.tan(lat_rad) + (1 / Math.cos(lat_rad))) / Math.PI) / 2.0 * n)
    return (xtile, ytile)
}
   
 
 