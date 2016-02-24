// glMatrix 2.3.2 or higher is required - make sure to include it before this js file

/**
 * Reads a GeoScene text file on the local webserver via AJAX
 * @param {filePath} The local or relative path to the text file to be read
 * @param {callback} A callback function which accepts a GeoScene output object as input parameter
 *                   (see parseGeoSceneContent() for more information)
 * @return {void}
 *
 * Example usage:
 *
 *     var callback = function (output) {
 *        // do something with output..
 *     };
 *     var res = readGeoSceneFile("myscene.geoscene", callback);
 *
 */
function readGeoSceneFile(filePath, callback) {
  var rawFile = new XMLHttpRequest();  
  rawFile.open("GET", filePath, true);
  rawFile.overrideMimeType('text/plain');
  rawFile.onreadystatechange = function () {
    if(rawFile.readyState === 4) {
      if(rawFile.status === 200 || rawFile.status == 0) {
        var content = rawFile.responseText;
        // Get basepath for geoscene data
        var basepath = filePath.replace(/\/[^\/\n]*$|\\+[^\\\n]*$/, '');
        var geoCastObj = parseGeoSceneContent(content, basepath);
        callback(geoCastObj);
      }
    }
  }
  rawFile.send();
}

// <[utility functions]>
function skipCommentAndEmptyLines(arrayOfLines, index) {
  if(index >= arrayOfLines.length)
    return index; // No-op
  var patt = /^\s*#.*|^\s*$/g;    
  while(patt.test(arrayOfLines[index]))
    ++index;
  return index;
};
function degToRad(degrees) {
  return degrees * Math.PI / 180;
}
function radToDeg(radians) {
  return radians / Math.PI * 180;
}

/**
 * Reads a GeoScene text file on the local webserver via AJAX and returns a GeoScene object
 * similar to the following
 *
 *   geoSceneObject = {
 *     version = "2.0";
 *     sequence = [0, 0];
 *     dataformat = "PNG";
 *     geoCastSequence = [
 *       {
 *         name = "Field0";
 *         size = [1400, 900];
 *         image = "../image.png";
 *         geocast = [geocastObject - see see parseGeoCastContent()];
 *       }, ...
 *     ]
 *     geoCastZSequence = [
 *       {
 *         name = "WorldFloor";
 *         size = [1400, 900];
 *         image = "../image.png";
 *         geocast = [geocastObject - see see parseGeoCastContent()];
 *       }, ...
 *     ]
 *     matchGroupSequence = [
 *       {
 *         index = 0;
 *         matchCamSequence = [
 *           "Field0", ...
 *         ]
 *         matchSurfaceSequence = [
 *           "WorldFloor", ...
 *         ]
 *       }, ...
 *     ]
 *   }
 *
 * @param {content} The string content of the GeoScene file
 * @param {basepath} Basepath to use when loading relative geocast files and images
 * @return {object} The GeoScene object
 */
function parseGeoSceneContent(content, basepath) {
  var output = {};
  var arrayOfLines = content.split("\n");
  var i = 0;

  // Check signature
  i = skipCommentAndEmptyLines(arrayOfLines, i);
  var patt = /GeoScene V(\d+\.\d+)/g;
  var res = patt.exec(arrayOfLines[i++].trim());
  if (!res) {
    console.log("Not a GeoScene file");
    return;
  }
  output.version = res[1];

  // Sequence
  i = skipCommentAndEmptyLines(arrayOfLines, i);
  var parts = arrayOfLines[i++].trim().split(' ');
  if (parts[0] != "Sequence") {
    console.log("Unrecognized sequence marker");
    return;
  }
  output.sequence = [parseFloat(parts[1]), parseFloat(parts[2])];

  // DataFormat
  i = skipCommentAndEmptyLines(arrayOfLines, i);
  parts = arrayOfLines[i++].trim().split(' ');
  if (parts[0] != "DataFormat") {
    console.log("Unrecognized dataformat marker");
    return;
  }
  output.dataformat = parts[1];

  // GeoCast sequence
  output.geoCastSequence = [];
  var objIndex = 0;
  do {
    i = skipCommentAndEmptyLines(arrayOfLines, i);
    if(i >= arrayOfLines.length)
      break;
    parts = arrayOfLines[i++].trim().split(' ');
    if (parts[0] != "GeoCast" || parts.length < 6) {
      --i;
      break;
    }
    var geocastSequenceObj = {};
    geocastSequenceObj.name = parts[1];
    geocastSequenceObj.size = [parseFloat(parts[2]), parseFloat(parts[3])];
    geocastSequenceObj.image = basepath + '/' + parts[4];    
    output.geoCastSequence.push(geocastSequenceObj);
    var geocastLoadedCallback = (function(j) {
      var index = j; // Closure capture
      return function(geocastObject) {
        output.geoCastSequence[index].geocast = geocastObject;
      };
    })(objIndex);
    readGeoCastFile(basepath + '/' + parts[5], geocastLoadedCallback);
    ++objIndex;
  } while(true);

  // GeoCastZ sequence
  output.geoCastZSequence = [];
  objIndex = 0;
  do {
    i = skipCommentAndEmptyLines(arrayOfLines, i);
    if(i >= arrayOfLines.length)
      break;
    parts = arrayOfLines[i++].trim().split(' ');
    if (parts[0] != "GeoCastZ" || parts.length < 6) {
      --i;
      break;
    }
    var geoCastZSequenceObj = {};
    geoCastZSequenceObj.name = parts[1];
    geoCastZSequenceObj.size = [parseFloat(parts[2]), parseFloat(parts[3])];
    geoCastZSequenceObj.image = basepath + '/' + parts[4];
    output.geoCastZSequence.push(geoCastZSequenceObj);
    var geocastLoadedCallback = (function(j) {
      var index = j; // Closure capture
      return function(geocastObject) {
        output.geoCastZSequence[index].geocast = geocastObject;
      };
    })(objIndex);
    readGeoCastFile(basepath + '/' + parts[5], geocastLoadedCallback);
    ++objIndex;
  } while(true);

  // Match groups sequence
  output.matchGroupSequence = [];
  do {
    i = skipCommentAndEmptyLines(arrayOfLines, i);
    if(i >= arrayOfLines.length)
      break;
    parts = arrayOfLines[i++].trim().split(' ');
    if (parts[0] != "MatchGroup" || parts.length != 2) {
      --i;
      break;
    }
    var matchGroupSequenceObj = {};
    matchGroupSequenceObj.index = parts[1];
    matchGroupSequenceObj.matchCamSequence = [];
    do {      
      i = skipCommentAndEmptyLines(arrayOfLines, i);
      if(i >= arrayOfLines.length)
        break;
      parts = arrayOfLines[i++].trim().split(' ');
      if (parts[0] != "MatchCam" || parts.length != 2) {
        --i;
        break;
      }
      matchGroupSequenceObj.matchCamSequence.push(parts[1]);
    } while(true);
    matchGroupSequenceObj.matchSurfaceSequence = [];
    do {      
      i = skipCommentAndEmptyLines(arrayOfLines, i);
      if(i >= arrayOfLines.length)
        break;
      parts = arrayOfLines[i++].trim().split(' ');
      if (parts[0] != "MatchSurface" || parts.length != 2) {
        --i;
        break;
      }
      matchGroupSequenceObj.matchSurfaceSequence.push(parts[1]);
    } while(true);
    output.matchGroupSequence.push(matchGroupSequenceObj);
  } while(true);

  return output;  
}

/**
 * Reads a GeoCast text file on the local webserver via AJAX
 * @param {filePath} The local or relative path to the text file to be read
 * @param {callback} A callback function which accepts the geocast object (see parseGeoCastContent())
 *                   as input parameter
 * @return {void}
 *
 * Example usage:
 *
 *     var callback = function (output) {
 *        // do something with output..
 *     };
 *     readGeoCastFile("mycamera.geocast", callback);
 */
function readGeoCastFile(filePath, callback) {
  var rawFile = new XMLHttpRequest();  
  rawFile.open("GET", filePath, true);
  rawFile.overrideMimeType('text/plain');
  rawFile.onreadystatechange = function () {
    if(rawFile.readyState === 4) {
      if(rawFile.status === 200 || rawFile.status == 0) {
        var content = rawFile.responseText;
        var geoCastObj = parseGeoCastContent(content);
        callback(geoCastObj);
      }
    }
  }
  rawFile.send();
}

/**
 * Parse the contents of a GeoCast file and returns a GeoCast object similar to the following
 *
 *  geoCastObject = {
 *    Version = "1.5";
 *    CameraType = "DynamicCamera";
 *    CameraPosition = [1.2, 3.4, 0.22];
 *    ViewSlice = {
 *      FODAngle = 145.0;
 *      Size = 100.0;
 *    };
 *    // Row-major
 *    ModelviewMatrix; // mat4 object
 *    ------ varying part -------
 *    DataProject = "Ortho";
 *    WindowSize = [12.0, 43.2];
 *    ProjRange = [0.10, 200.0];
 *    OrthoMatrix; // mat4 object
 *    ---------------------------
 *    DataProject = "Perspective";
 *    Fovy = 45.0; (degrees)
 *    Aspect = 1.0;
 *    ClipRange = [1.0, 200.0];
 *    PerspMatrix; // mat4 object
 *    --- end of varying part ---
 *    ZDataRange = [0.0, 100.0];
 *    WorldSpaceDepth = true;
 *    ImageWarp = {
 *      aspect = 0.2;
 *      k1 = 0.2;
 *      k2 = 0.2;
 *      k3 = 0.2;
 *      p1 = 0.2;
 *      p2 = 0.2;
 *      centerX = 0.2;
 *      centerY = 0.2;
 *      focal = 0.2;
 *    };
 *  }
 *
 * @param {content} The string content of the GeoCast file
 * @return {object} The GeoCast object
 */

function parseGeoCastContent(content) {
  var output = {};
  var arrayOfLines = content.split("\n");
  var i = 0;

  // Check signature
  i = skipCommentAndEmptyLines(arrayOfLines, i);
  var patt = /GeoCast V(\d+\.\d+)/g;
  var res = patt.exec(arrayOfLines[i++].trim());
  if (!res) {
    console.log("Not a recognized GeoCast file");
    return;
  }
  output.Version = res[1];

  while (i < arrayOfLines.length) {

    i = skipCommentAndEmptyLines(arrayOfLines, i);
    if (i >= arrayOfLines.length)
      break;
    var parts = arrayOfLines[i].trim().split(' ');

    if (parts[0] == "DynamicCamera" || parts[0] == "StaticCamera")
      output.CameraType = parts[0];
    else if (parts[0] == "Pos") {
      var cameraPosition = [];
      cameraPosition.push(parseFloat(parts[1]));
      cameraPosition.push(parseFloat(parts[2]));
      cameraPosition.push(parseFloat(parts[3]));
      output.CameraPosition = cameraPosition;
    } else if (parts[0] == "ViewSlice") {
      output.ViewSlice = {
        FODAngle: parseFloat(parts[2]),
        Size: parseFloat(parts[4])
      };
    } else if (parts[0] == "ModelviewMatrix") {
      output.ModelviewMatrix = mat4.create();
      var readMatrixRow = function(line, index) {
        parts = line.trim().split(' ');
        output.ModelviewMatrix[4 * index + 0] = parseFloat(parts[0]);
        output.ModelviewMatrix[4 * index + 1] = parseFloat(parts[1]);
        output.ModelviewMatrix[4 * index + 2] = parseFloat(parts[2]);
        output.ModelviewMatrix[4 * index + 3] = parseFloat(parts[3]);
      };
      for (var j = 0; j < 4; j++) {
        readMatrixRow(arrayOfLines[++i], j);
      }
    } else if (parts[0] == "DataProject") {
      output.DataProject = parts[1];
      if (output.DataProject == "Ortho") { // Orthographic view
        if (parts[2] != "Window") {
          console.log("Unrecognized Window tag");
          return;
        }
        output.WindowSize = [parseFloat(parts[3]), parseFloat(parts[4])];
        if (parts[5] != "ProjRange") {
          console.log("Unrecognized ProjRange tag");
          return;
        }
        output.ProjRange = [parseFloat(parts[6]), parseFloat(parts[7])];
        output.OrthoMatrix = mat4.create();
        mat4.ortho(output.OrthoMatrix,
            -output.WindowSize[0], output.WindowSize[0], 
            -output.WindowSize[1], output.WindowSize[1],
            output.ProjRange[0], output.ProjRange[1]);
      } else if (output.DataProject == "Perspective") { // Perspective view
        if (parts[2] != "Fovy") {
          console.log("Unrecognized Fovy tag");
          return;
        }
        output.Fovy = parseFloat(parts[3]);
        if (parts[4] != "Aspect") {
          console.log("Unrecognized Aspect tag");
          return;
        }
        output.Aspect = parseFloat(parts[5]);
        if (parts[6] != "ClipRange") {
          console.log("Unrecognized ClipRange tag");
          return;
        }    
        output.ClipRange = [parseFloat(parts[7]), parseFloat(parts[8])];
        output.PerspMatrix = mat4.create();
        mat4.perspective(output.PerspMatrix, degToRad(output.Fovy), output.Aspect, 
                         output.ClipRange[0], output.ClipRange[1]);
      } else {
        console.log("Unrecognized DataProject camera type");
      }
    } else if (parts[0] == "ImageWarp") {
      output.ImageWarp = {
        aspect: parseFloat(parts[2]),
        k1: parseFloat(parts[4]),
        k2: parseFloat(parts[6]),
        k3: parseFloat(parts[8]),
        p1: parseFloat(parts[10]),
        p2: parseFloat(parts[12]),
        centerX: parseFloat(parts[14]),
        centerY: parseFloat(parts[16]),
        focal: parseFloat(parts[18])
      };
    } else if (parts[0] == "ZDataRange") {
      output.ZDataRange = [parseFloat(parts[1]), parseFloat(parts[2])];
    } else if (parts[0] == "WorldSpaceDepth") {
      output.WorldSpaceDepth = true;
    } else
      console.log("Unrecognized line: '" + arrayOfLines[i] + "'");

    ++i;
  }

  return output;
}