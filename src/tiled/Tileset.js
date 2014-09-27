var utils = require('../utils');

/**
 * This object represents a tileset used by a Tilemap.
 * There can be multiple Tilesets in a map
 *
 * @class Tileset
 * @extends Texture
 * @constructor
 * @param settings {Object} All the settings for the tileset
 * @param settings.tilewidth {Number} The width of a single tile in the set
 * @param settings.tileheight {Number} The height of a single tile in the set
 * @param [settings.firstgid=1] {Number} The id of the first tile in the set, defaults to 1
 * @param [settings.spacing=0] {Number} The spacing around tiles in the tileset (in pixels)
 * @param [settings.margin=0] {Number} The margin around a tile in the tileset (in pixels)
 * @param [settings.tileoffset] {Object} The offset to apply to a tile rendered from this tileset
 * @param [settings.tileoffset.x=0] {Number} The X offset to apply to the tile
 * @param [settings.tileoffset.y=0] {Number} The Y offset to apply to the tile
 * @param [settings.properties] {Object} User-defined, custom properties that apply to the tileset
 * @param [settings.tileproperties] {Object} User-defined, custom properties that apply to tiles in the tileset.
 *          The keys of this object should the tile id of the properties
 * @param [settings.tiles] {Object} Extra metadata about specific tiles
 * @param [settings.imagewidth] {Number} An override for the image width
 * @param [settings.imageheight] {Number} An override for the image height
 */
//TODO: Implement multi-image tileset support
//TODO: Support external tilesets (TSX files) via the "source" attribute
//see: https://github.com/bjorn/tiled/wiki/TMX-Map-Format#tileset
function Tileset(textureKey, settings) {
    PIXI.Texture.call(this, PIXI.BaseTextureCache[textureKey]);

    //Tiled Editor properties

    /**
     * The first tileId in the tileset
     *
     * @property firstgid
     * @type Number
     */
    this.firstgid = settings.firstgid || 1;

    /**
     * The name of the tileset
     *
     * @property name
     * @type String
     */
    this.name = settings.name;

    /**
     * The width of a tile in the tileset
     *
     * @property tileWidth
     * @type Number
     */
    this.tileWidth = settings.tilewidth;

    /**
     * The height of a tile in the tileset
     *
     * @property tileHeight
     * @type Number
     */
    this.tileHeight = settings.tileheight;

    /**
     * The spacing around a tile in the tileset
     *
     * @property spacing
     * @type Number
     */
    this.spacing = settings.spacing || 0;

    /**
     * The margin around a tile in the tileset
     *
     * @property margin
     * @type Number
     */
    this.margin = settings.margin || 0;

    /**
     * The offset of tile positions when rendered
     *
     * @property tileoffset
     * @type Phaser.Point
     */
    this.tileoffset = new Phaser.Point(
        settings.tileoffset ? settings.tileoffset.x : 0,
        settings.tileoffset ? settings.tileoffset.y : 0
    );

    //TODO: Support for "terraintypes," "image"
    //see: https://github.com/bjorn/tiled/wiki/TMX-Map-Format#tileset

    //Custom/Optional properties

    /**
     * The number of tiles calculated based on size, margin, and spacing
     *
     * @property numTiles
     * @type Vector
     */
    this.numTiles = new Phaser.Point(
        Phaser.Math.floor((this.baseTexture.source.width - this.margin) / (this.tileWidth - this.spacing)),
        Phaser.Math.floor((this.baseTexture.source.height - this.margin) / (this.tileHeight - this.spacing))
    );

    /**
     * The last tileId in the tileset
     *
     * @property lastgid
     * @type Number
     */
    this.lastgid = this.firstgid + ((this.numTiles.x * this.numTiles.y) || 1) - 1;

    /**
     * The properties of the tileset
     *
     * @property properties
     * @type Object
     */
    this.properties = settings.properties || {};

    /**
     * The properties of the tiles in the tileset
     *
     * @property tileproperties
     * @type Object
     */
    this.tileproperties = settings.tileproperties || {};

    /**
     * The size of the tileset
     *
     * @property size
     * @type Vector
     */
    this.size = new Phaser.Point(
        settings.imagewidth || this.baseTexture.source.width,
        settings.imageheight || this.baseTexture.source.height
    );

    /**
     * The texture instances for each tile in the set
     *
     * @property textures
     * @type Array
     */
    this.textures = [];

    // massages strings into the values they should be
    // i.e. "true" becomes the value: true
    this.properties = utils.parseTiledProperties(this.properties);

    // massage tile properties
    for (var k in this.tileproperties) {
        this.tileproperties[k] = utils.parseTiledProperties(this.tileproperties[k]);
    }

    // generate tile textures
    for(var t = 0, tl = this.lastgid - this.firstgid + 1; t < tl; ++t) {
        // convert the tileId to x,y coords of the tile in the Texture
        var y = Phaser.Math.floor(t / this.numTiles.x),
            x = (t - (y * this.numTiles.x));

        // get location in pixels
        x = (x * this.tileWidth) + (x * this.spacing) + this.margin;
        y = (y * this.tileHeight) + (y * this.spacing) + this.margin;

        this.textures.push(
            new PIXI.Texture(
                this.baseTexture,
                new Phaser.Rectangle(x, y, this.tileWidth, this.tileHeight)
            )
        );
    }

    // this.tileanimations = {};

    // // parse extra information about the tiles
    // for (var p in settings.tiles) {
    //     if (settings.tiles[p].animation) {
    //         this.tileanimations[p] = settings.tiles[p].animation;
    //     }

    //     for (var a = 0; a < settings.tiles[p].animation.length; ++a) {
    //         this.tileanimations[p].push(this.textures[settings.tiles[p].animation[a].tileid]);
    //     }

    //     // image - url
    //     // animation - array
    //     // objectgroup - collision data
    // }
}

Tileset.prototype = Object.create(PIXI.Texture.prototype);
Tileset.prototype.constructor = Tileset;

module.exports = Tileset;

/**
 * Gets the tile properties for a tile based on it's ID
 *
 * @method getTileProperties
 * @param tileId {Number} The id of the tile to get the properties for
 * @return {Object} The properties of the tile
 */
Tileset.prototype.getTileProperties = function (tileId) {
    if (!tileId) {
        return null;
    }

    var flags = Tileset.FLAGS,
        flippedX = tileId & flags.FLIPPED_HORZ,
        flippedY = tileId & flags.FLIPPED_VERT,
        flippedAD = tileId & flags.FLIPPED_ANTI_DIAG;

    tileId = (tileId & ~Tileset.FLAGS.ALL) - this.firstgid;

    // if less than 0, then this id isn't in this tileset
    if (tileId < 0) {
        return null;
    }

    var props = this.tileproperties[tileId] ?
        //get this value
        this.tileproperties[tileId] :
        //set this id to default values and cache
        this.tileproperties[tileId] = {
            collidable: false,
            breakable: false
        };

    props.flippedX = flippedX;
    props.flippedY = flippedY;
    props.flippedAD = flippedAD;

    return props;
};

/**
 * Gets the tile texture for a tile based on it's ID
 *
 * @method getTileTexture
 * @param tileId {Number} The id of the tile to get the texture for
 * @return {Texture} The texture for the tile
 */
Tileset.prototype.getTileTexture = function (tileId) {
    if (!tileId) {
        return null;
    }

    // get the internal ID of the tile in this set (0 indexed)
    tileId = (tileId & ~Tileset.FLAGS.ALL) - this.firstgid;

    // if less than 0, then this id isn't in this tileset
    if (tileId < 0) {
        return null;
    }

    return this.textures[tileId];
};

/**
 * Returns whether or not this tileset contains the given tile guid
 *
 * @method contains
 * @param tileId {Number} The ID of the tile to check
 * @return {Boolean}
 */
Tileset.prototype.contains = function (tileId) {
    if (!tileId) {
        return false;
    }

    tileId &= ~Tileset.FLAGS.ALL;

    return (tileId >= this.firstgid && tileId <= this.lastgid);
};

/**
 * Tileset GID flags, these flags are set on a tile's ID to give it a special property
 *
 * @property FLAGS
 * @static
 */
Tileset.FLAGS = {
    FLIPPED_HORZ: 0x80000000,
    FLIPPED_VERT: 0x40000000,
    FLIPPED_ANTI_DIAG: 0x20000000
};

var mask = 0;
for(var f in Tileset.FLAGS) {
    mask |= Tileset.FLAGS[f];
}

Tileset.FLAGS.ALL = mask;
