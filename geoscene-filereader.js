// glMatrix 2.3.2 or higher is required - make sure to include it before this js file

/**
 * Reads a GeoScene text file on the local webserver via AJAX
 * @param {filePath} The local or relative path to the text file to be read
 * @param {callback} A callback function which accepts a GeoScene output object as input parameter
 *                   (see below for more information)
 * @return {void}
 *
 * Example usage:
 *
 *     var callback = function (output) {
 *        // do something with output..
 *     };
 *     var res = readGeoSceneFile("myscene.geoscene", callback);
 *
 * A GeoScene output object is similar to the following
 *
 *   geoSceneObject = {
 *   
 *   }
 */
function readGeoSceneFile(filePath, callback) {
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

  var skipCommentLines = function(index) {
    var patt = /^\s*#.*/g;    
    while(patt.test(arrayOfLines[index]))
      ++index;
    return index;
  };

  // Check signature
  i = skipCommentLines(i);
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
  i = skipCommentLines(i);
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
  i = skipCommentLines(i);
  parts = arrayOfLines[i++].trim().split(' ');
  if (parts[0] != "ViewSlice") {
    alert("Unrecognized ViewSlice tag");
    return;
  }
  output.viewSlice_FODAngle = parseFloat(parts[2]);
  output.viewSlice_Size = parseFloat(parts[4]);

  // ModelviewMatrix
  i = skipCommentLines(i);
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
  i = skipCommentLines(i);
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
  i = skipCommentLines(i);
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