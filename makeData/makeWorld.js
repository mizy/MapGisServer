const fs =require("fs");
const world  = require("./world.json")
const features = world.features;
let str = `SET CLIENT_ENCODING TO UTF8;
SET STANDARD_CONFORMING_STRINGS TO ON;
BEGIN;
CREATE TABLE "world" (gid serial PRIMARY KEY,
"CNAME" varchar(254),
"GB" varchar(40),
"center_lat" float8,
"center_lng" float8);
SELECT AddGeometryColumn('','world','geom','4326','MULTIPOLYGON',2);
`;
features.forEach(feature=>{
	const properties = feature.properties;
	console.log(JSON.stringify(properties));
	str += `INSERT INTO "world" ("CNAME","GB","center_lat","center_lng",geom) VALUES ('${properties.CNAME}','${properties.GB}','${properties.lat}','${properties.lng}', st_setsrid(st_geomfromgeojson('${JSON.stringify(feature.geometry)}'),4326) );`;
})
fs.writeFileSync("./world.sql",str)