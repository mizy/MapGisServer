SET CLIENT_ENCODING TO UTF8;
SET STANDARD_CONFORMING_STRINGS TO ON;
BEGIN;
CREATE TABLE "world" (gid serial PRIMARY KEY,
"CNAME" varchar(254),
"GB" varchar(40),
"center_lat" float8,
"center_lng" float8);
SELECT AddGeometryColumn('','world','geom','4326','MULTIPOLYGON',2);