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
  while(index < arrayOfLines.length) {
    var skipThisLine = true;
    for (var i = 0; i < arrayOfLines[index].length; ++i) {
      if (arrayOfLines[index][i] == '\r' || arrayOfLines[index][i] == '\n' ||
          arrayOfLines[index][i] == ' ') {
        // Continue skipping
        skipThisLine = true;
      } else if (arrayOfLines[index][i] == '#') {
        skipThisLine = true;
        break; // Comment line
      } else {
        skipThisLine = false;
        break; // Something found - parse it
      }
    }
    if (skipThisLine == true)
      ++index; // Continue with the next one
    else
      break; // Found a line which needs parsing
  }
  return index;
};
function degToRad(degrees) {
  return degrees * Math.PI / 180;
}
function radToDeg(radians) {
  return radians / Math.PI * 180;
}
function padWithZeros(num, size) {
  var s = num + "";
  while (s.length < size) 
    s = "0" + s;
  return s;
}
function readSequenceAsArray(path, sequence) { // Reads an array from a printf-like format string
  var pat1 = /%(\d+)d/g;
  var pat2 = /%d/g;
  var patternWithDigits = pat1.test(path);
  var patternWithoutDigits = pat2.test(path);
  if (patternWithDigits == false && patternWithoutDigits == false)
    return [path];
  else {
    var ret = [];
    if (patternWithoutDigits == true) {
      for (var i = sequence[0]; i <= sequence[1]; ++i) {
        var res = path.replace(pat2, i);
        ret.push(res);
      }
    } else { // Also handles variable sequences, e.g. "file%05d/folder%02d/"
      for (var i = sequence[0]; i <= sequence[1]; ++i)
        ret.push(path);
      pat1.lastIndex = 0; // Resets to the first found one
      var pat_no_g = new RegExp(pat1.source, "");
      var localres;
      while(true) {
        localres = pat1.exec(path);
        if (localres == null)
          break;
        var digits = parseInt(localres[1]);
        for (var i = sequence[0]; i <= sequence[1]; ++i)
          ret[i - sequence[0]] = ret[i - sequence[0]].replace(pat_no_g, padWithZeros(i, digits));
      }
    }
    return ret;
  }
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
 *         image = ["../image.png"]; // Array whose length depends on the geoScene sequence
 *         geocast = [geocastObject - see see parseGeoCastContent()]; // Ditto as above
 *       }, ...
 *     ]
 *     geoCastZSequence = [
 *       {
 *         name = "WorldFloor";
 *         size = [1400, 900];
 *         image = ["../image.png"]; // Array whose length depends on the geoScene sequence
 *         geocast = [geocastObject - see see parseGeoCastContent()]; // Ditto as above
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
  if (i >= arrayOfLines.length) {
    console.log("Corrupted GeoScene file");
    return;
  }
  var patt = /GeoScene V(\d+\.\d+)/g;
  var res = patt.exec(arrayOfLines[i].trim());
  if (!res) {
    console.log("Not a GeoScene file");
    return;
  }
  output.version = res[1];
  ++i;

  output.geoCastSequence = [];
  output.geoCastZSequence = [];
  output.matchGroupSequence = [];

  while (i < arrayOfLines.length) {

    i = skipCommentAndEmptyLines(arrayOfLines, i);
    if (i >= arrayOfLines.length)
      break;
    var parts = arrayOfLines[i].trim().split(' ');

    if (parts[0] == "Sequence") {
      output.sequence = [parseFloat(parts[1]), parseFloat(parts[2])];
    } else if (parts[0] == "DataFormat") {
      output.dataformat = parts[1];
    } else if (parts[0] == "GeoCast") {
      var geocastSequenceObj = {};
      geocastSequenceObj.name = parts[1];
      geocastSequenceObj.size = [parseFloat(parts[2]), parseFloat(parts[3])];
      geocastSequenceObj.image = readSequenceAsArray(basepath + '/' + parts[4], output.sequence);
      geocastSequenceObj.geocast = [];
      output.geoCastSequence.push(geocastSequenceObj);
      var index1 = output.geoCastSequence.length - 1;
      var arr = readSequenceAsArray(basepath + '/' + parts[5], output.sequence);
      output.geoCastSequence[index1].geocast = [];
      for (var k = 0; k < arr.length; ++k) {
        output.geoCastSequence[index1].geocast.push({});
        var index2 = k; // or output.geoCastSequence[index1].geocast.length - 1
        var geocastLoadedCallback = (function(index1, index2) {
          var captureIndex1 = index1; // Closure captures
          var captureIndex2 = index2;
          return function(geocastObject) {
            output.geoCastSequence[captureIndex1].geocast[captureIndex2] = geocastObject;
          };
        })(index1, index2);
        readGeoCastFile(arr[k], geocastLoadedCallback);
      }
    } else if (parts[0] == "GeoCastZ") {
      var geoCastZSequenceObj = {};
      geoCastZSequenceObj.name = parts[1];
      geoCastZSequenceObj.size = [parseFloat(parts[2]), parseFloat(parts[3])];
      geoCastZSequenceObj.image = readSequenceAsArray(basepath + '/' + parts[4], output.sequence);
      geoCastZSequenceObj.geocast = [];
      output.geoCastZSequence.push(geoCastZSequenceObj);
      var index1 = output.geoCastZSequence.length - 1;
      var arr = readSequenceAsArray(basepath + '/' + parts[5], output.sequence);
      output.geoCastZSequence[index1].geocast = [];
      for (var k = 0; k < arr.length; ++k) {
        output.geoCastZSequence[index1].geocast.push({});
        var index2 = k; // or output.geoCastZSequence[index1].geocast.length - 1
        var geocastLoadedCallback = (function(index1, index2) {
          var captureIndex1 = index1; // Closure captures
          var captureIndex2 = index2;
          return function(geocastObject) {
            output.geoCastZSequence[captureIndex1].geocast[captureIndex2] = geocastObject;
          };
        })(index1, index2);
        readGeoCastFile(arr[k], geocastLoadedCallback);
      }
    } else if (parts[0] == "MatchGroup") {
      var matchGroupSequenceObj = {};
      matchGroupSequenceObj.index = parts[1];
      matchGroupSequenceObj.matchCamSequence = [];
      matchGroupSequenceObj.matchSurfaceSequence = [];
      ++i;
      while (true) {
        i = skipCommentAndEmptyLines(arrayOfLines, i);
        if(i >= arrayOfLines.length)
          break;
        parts = arrayOfLines[i].trim().split(' ');
        if (parts[0] == "MatchCam") {
          matchGroupSequenceObj.matchCamSequence.push(parts[1]);
        } else if (parts[0] == "MatchSurface") {
          matchGroupSequenceObj.matchSurfaceSequence.push(parts[1]);
        } else {
          --i;   // Avoids considering this line 'parsed' for the next iteration
          break; // Not MatchCam or MatchSurface
        }
        ++i;
      }
      output.matchGroupSequence.push(matchGroupSequenceObj);
    }
  
    ++i;
  }

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
        if (parts[2] != "WindowSize" && parts[2] != "Window") {
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