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
        var geoCastObj = parseGeoSceneContent(content);
        callback(geoCastObj);
      }
    }
  }
  rawFile.send();
}

// [utility function] Skip comment and empty lines
function skipCommentAndEmptyLines(arrayOfLines, index) {
  if(index >= arrayOfLines.length)
    return index; // No-op
  var patt = /^\s*#.*|^\s*$/g;    
  while(patt.test(arrayOfLines[index]))
    ++index;
  return index;
};

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
 *         geocast = "../geocast_file.geocast";
 *       }, ...
 *     ]
 *     geoCastZSequence = [
 *       {
 *         name = "WorldFloor";
 *         size = [1400, 900];
 *         image = "../image.png";
 *         geocast = "../geocast_file.geocast";
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
 * @return {object} The GeoScene object
 */
function parseGeoSceneContent(content) {
  var output = {};
  var arrayOfLines = content.split("\n");
  var i = 0;

  // Check signature
  i = skipCommentAndEmptyLines(arrayOfLines, i);
  var patt = /GeoScene V(\d+\.\d+)/g;
  var res = patt.exec(arrayOfLines[i++].trim());
  if (!res) {
    alert("Not a GeoScene file");
    return;
  }
  output.version = res[1];

  // Sequence
  i = skipCommentAndEmptyLines(arrayOfLines, i);
  var parts = arrayOfLines[i++].trim().split(' ');
  if (parts[0] != "Sequence") {
    alert("Unrecognized sequence marker");
    return;
  }
  output.sequence = [parseFloat(parts[1]), parseFloat(parts[2])];

  // DataFormat
  i = skipCommentAndEmptyLines(arrayOfLines, i);
  parts = arrayOfLines[i++].trim().split(' ');
  if (parts[0] != "DataFormat") {
    alert("Unrecognized dataformat marker");
    return;
  }
  output.dataformat = parts[1];

  // GeoCast sequence
  output.geoCastSequence = [];
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
    geocastSequenceObj.image = parts[4];
    geocastSequenceObj.geocast = parts[5];
    output.geoCastSequence.push(geocastSequenceObj);
  } while(true);

  // GeoCastZ sequence
  output.geoCastZSequence = [];
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
    geoCastZSequenceObj.image = parts[4];
    geoCastZSequenceObj.geocast = parts[5];
    output.geoCastZSequence.push(geoCastZSequenceObj);
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
 *     var res = readGeoCastFile("mycamera.geocast", callback);
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
 *    version = "1.5";
 *    cameraType = "DynamicCamera";
 *    cameraPosition = [1.2, 3.4, 0.22];
 *    viewSlice_FODAngle = 145.0;
 *    viewSlice_Size = 100.0;
 *    // Row-major
 *    modelviewMatrix; // mat4 object
 *    ------ varying part -------
 *    dataProject = "Ortho";
 *    windowSize = [12.0, 43.2];
 *    projRange = [0.10, 200.0];
 *    orthoMatrix; // mat4 object
 *    ---------------------------
 *    dataProject = "Perspective";
 *    Fovy = 45.0; (degrees)
 *    Aspect = 1.0;
 *    ClipRange = [1.0, 200.0];
 *    perspMatrix; // mat4 object
 *    --- end of varying part ---
 *    
 *    *optional* worldSpaceDepth = true;
 *    ZDataRange = [0.0, 100.0];
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
    alert("Not a GeoCast file");
    return;
  }
  output.version = res[1];

  var cameraType = arrayOfLines[i++].trim();
  if (cameraType != "DynamicCamera" && cameraType != "StaticCamera") {
    alert("Unrecognized camera type");
    return;
  }
  output.cameraType = cameraType;

  // Pos
  i = skipCommentAndEmptyLines(arrayOfLines, i);
  var parts = arrayOfLines[i++].trim().split(' ');
  if (parts[0] != "Pos") {
    alert("Unrecognized camera position");
    return;
  }
  var cameraPosition = [];
  cameraPosition.push(parseFloat(parts[1]));
  cameraPosition.push(parseFloat(parts[2]));
  cameraPosition.push(parseFloat(parts[3]));
  output.cameraPosition = cameraPosition;

  // ViewSlice
  i = skipCommentAndEmptyLines(arrayOfLines, i);
  parts = arrayOfLines[i++].trim().split(' ');
  if (parts[0] != "ViewSlice") {
    alert("Unrecognized ViewSlice tag");
    return;
  }
  output.viewSlice_FODAngle = parseFloat(parts[2]);
  output.viewSlice_Size = parseFloat(parts[4]);

  // ModelviewMatrix
  i = skipCommentAndEmptyLines(arrayOfLines, i);
  if (arrayOfLines[i++].trim() != "ModelviewMatrix") {
    alert("Unrecognized MVM type");
    return;
  }
  output.modelviewMatrix = mat4.create();
  var readMatrixRow = function(line, index) {
    parts = line.trim().split(' ');
    output.modelviewMatrix[4 * index + 0] = parseFloat(parts[0]);
    output.modelviewMatrix[4 * index + 1] = parseFloat(parts[1]);
    output.modelviewMatrix[4 * index + 2] = parseFloat(parts[2]);
    output.modelviewMatrix[4 * index + 3] = parseFloat(parts[3]);
  };
  for (var j = 0; j < 4; j++) {
    readMatrixRow(arrayOfLines[i++], j);
  }

  // DataProject
  i = skipCommentAndEmptyLines(arrayOfLines, i);
  parts = arrayOfLines[i++].trim().split(' ');
  if (parts[0] != "DataProject") {
    alert("Unrecognized DataProject tag");
    return;
  }
  output.dataProject = parts[1];
  if (output.dataProject == "Ortho") { // Orthographic view
    if (parts[2] != "WindowSize") {
      alert("Unrecognized WindowSize tag");
      return;
    }
    output.windowSize = [parseFloat(parts[3]), parseFloat(parts[4])];
    if (parts[5] != "ProjRange") {
      alert("Unrecognized ProjRange tag");
      return;
    }
    output.projRange = [parseFloat(parts[6]), parseFloat(parts[7])];
    output.orthoMatrix = mat4.create();
    mat4.ortho(output.orthoMatrix,
        -output.windowSize[0], output.windowSize[0], 
        -output.windowSize[1], output.windowSize[1],
        output.projRange[0], output.projRange[1]);
  } else if (output.dataProject == "Perspective") { // Perspective view
    if (parts[2] != "Fovy") {
      alert("Unrecognized Fovy tag");
      return;
    }
    output.Fovy = parseFloat(parts[3]);
    if (parts[4] != "Aspect") {
      alert("Unrecognized Aspect tag");
      return;
    }
    output.Aspect = parseFloat(parts[5]);
    if (parts[6] != "ClipRange") {
      alert("Unrecognized ClipRange tag");
      return;
    }    
    output.ClipRange = [parseFloat(parts[7]), parseFloat(parts[8])];
    output.perspMatrix = mat4.create();
    mat4.perspective(output.perspMatrix, degToRad(output.Fovy), output.Aspect, 
                     output.ClipRange[0], output.ClipRange[1]);
  } else {
    alert("Unrecognized DataProject camera type");
    return;
  }

  // WorldSpaceDepth - optional
  output.worldSpaceDepth = false;
  i = skipCommentAndEmptyLines(arrayOfLines, i);
  var line = arrayOfLines[i].trim();
  if (line == "WorldSpaceDepth") {
    output.worldSpaceDepth = true;
    ++i;
  }

  // ZDataRange
  parts = arrayOfLines[i].trim().split(' ');
  if (parts[0] != "ZDataRange") {
    alert("Unrecognized ZDataRange tag");
    return;
  }
  output.ZDataRange = [parseFloat(parts[1]), parseFloat(parts[2])];

  return output;
}