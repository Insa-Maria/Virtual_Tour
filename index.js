/*
 * Copyright 2016 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';


(function() {
  var Marzipano = window.Marzipano;
  var bowser = window.bowser;
  var screenfull = window.screenfull;
  var data = window.APP_DATA;

  // Grab elements from DOM.
  var panoElement = document.querySelector('#pano');
  var sceneNameElement = document.querySelector('#titleBar .sceneName');
  var sceneListElement = document.querySelector('#sceneList');
  var sceneElements = document.querySelectorAll('#sceneList .scene');
  var sceneViewElement = document.querySelector('#sceneView');
  var sceneControlElement = document.querySelector('#sceneControl');

  var sceneListToggleElement = document.querySelector('#sceneListToggle');
  var autorotateToggleElement = document.querySelector('#autorotateToggle');
  var fullscreenToggleElement = document.querySelector('#fullscreenToggle');

  var TheVerb = {id:"http://adlnet.gov/expapi/verbs/experienced", display:{ "en-US": "experienced" }};
  var TheObject = {id:"http://myurl.com/activities/marzipano", "definition":{ "description":{ "en-US": "" }}};

  // Detect desktop or mobile mode.
  if (window.matchMedia) {
    var setMode = function() {
      if (mql.matches) {
        document.body.classList.remove('desktop');
        document.body.classList.add('mobile');
      } else {
        document.body.classList.remove('mobile');
        document.body.classList.add('desktop');
      }
    };
    var mql = matchMedia("(max-width: 500px), (max-height: 500px)");
    setMode();
    mql.addListener(setMode);
  } else {
    document.body.classList.add('desktop');
  }

  // Detect whether we are on a touch device.
  document.body.classList.add('no-touch');
  window.addEventListener('touchstart', function() {
    document.body.classList.remove('no-touch');
    document.body.classList.add('touch');
  });

  // Use tooltip fallback mode on IE < 11.
  if (bowser.msie && parseFloat(bowser.version) < 11) {
    document.body.classList.add('tooltip-fallback');
  }

  // Viewer options.
  var viewerOpts = {
    controls: {
      mouseViewMode: data.settings.mouseViewMode
    }
  };

  // Initialize viewer.
  var viewer = new Marzipano.Viewer(panoElement, viewerOpts);

  // Create scenes.
  var scenes = data.scenes.map(function(data) {
    var urlPrefix = "tiles";
    var source = Marzipano.ImageUrlSource.fromString(
      urlPrefix + "/" + data.id + "/{z}/{f}/{y}/{x}.jpg",
      { cubeMapPreviewUrl: urlPrefix + "/" + data.id + "/preview.jpg" });
    var geometry = new Marzipano.CubeGeometry(data.levels);

    var limiter = Marzipano.RectilinearView.limit.traditional(data.faceSize, 100*Math.PI/180, 120*Math.PI/180);
    var view = new Marzipano.RectilinearView(data.initialViewParameters, limiter);

    var scene = viewer.createScene({
      source: source,
      geometry: geometry,
      view: view,
      pinFirstLevel: true
    });

    // Create Map_link hotspots.
    data.maplinkHotspots.forEach(function(hotspot) {
      var element = createMapLinkHotspotElement(hotspot);
      scene.hotspotContainer().createHotspot(element, { yaw: hotspot.yaw, pitch: hotspot.pitch });
    });

    // Create link hotspots.
    data.linkHotspots.forEach(function(hotspot) {
      var element = createLinkHotspotElement(hotspot);
      scene.hotspotContainer().createHotspot(element, { yaw: hotspot.yaw, pitch: hotspot.pitch });

    
    });

    // Create info hotspots.
    data.infoHotspots.forEach(function(hotspot) {
      var element = createInfoHotspotElement(hotspot);
      scene.hotspotContainer().createHotspot(element, { yaw: hotspot.yaw, pitch: hotspot.pitch });


      // added from   https://digitallearningsolutions.com.au/connecting-marzipano-to-xapi-part-one/
      element.addEventListener('click', function() {
        TheObject.definition_name = 'Info_Hotspot - Click. '+  hotspot.title ;
        TheObject.definition_description =  hotspot.text; //edited to TheObject.definition.description
        
       sendxAPI(hotspot,TheVerb,TheObject);
      });
    
    });

    // Create video hotspots.
    data.videoHotspots.forEach(function(hotspot) {
      var element = createVideoHotspotElement(hotspot);
      scene.hotspotContainer().createHotspot(element, { yaw: hotspot.yaw, pitch: hotspot.pitch });
      //console.log(hotspot);
    });
  
    return {
      data: data,
      scene: scene,
      view: view
    };

  });


  // Set up autorotate, if enabled.
  var autorotate = Marzipano.autorotate({
    yawSpeed: 0.03,
    targetPitch: 0,
    targetFov: Math.PI/2
  });
  if (data.settings.autorotateEnabled) {
    autorotateToggleElement.classList.add('enabled');
  }

  // Set handler for autorotate toggle.
  autorotateToggleElement.addEventListener('click', toggleAutorotate);

  // Set up fullscreen mode, if supported.
  if (screenfull.enabled && data.settings.fullscreenButton) {
    document.body.classList.add('fullscreen-enabled');
    fullscreenToggleElement.addEventListener('click', function() {
      screenfull.toggle();
    });
    screenfull.on('change', function() {
      if (screenfull.isFullscreen) {
        fullscreenToggleElement.classList.add('enabled');
      } else {
        fullscreenToggleElement.classList.remove('enabled');
      }
    });
  } else {
    document.body.classList.add('fullscreen-disabled');
  }


  // Set handler for scene list toggle.
  sceneListToggleElement.addEventListener('click', toggleSceneList);


  // Start with the scene list open on desktop.
  if (!document.body.classList.contains('mobile')) {
    showSceneList();
    // showSceneView();
  }

  // Set handler for scene switch.
  scenes.forEach(function(scene) {
    var el = document.querySelector('#sceneList .scene[data-id="' + scene.data.id + '"]');
    el.addEventListener('click', function() {
      switchScene(scene);
      // On mobile, hide scene list after selecting a scene.
      if (document.body.classList.contains('mobile')) {
        hideSceneList();
        // hideSceneView();
      }
    });
  });



  // DOM elements for view controls.
  var viewUpElement = document.querySelector('#viewUp');
  var viewDownElement = document.querySelector('#viewDown');
  var viewLeftElement = document.querySelector('#viewLeft');
  var viewRightElement = document.querySelector('#viewRight');
  var viewInElement = document.querySelector('#viewIn');
  var viewOutElement = document.querySelector('#viewOut');

  // Dynamic parameters for controls.
  var velocity = 0.7;
  var friction = 3;

  // Associate view controls with elements.
  var controls = viewer.controls();
  controls.registerMethod('upElement',    new Marzipano.ElementPressControlMethod(viewUpElement,     'y', -velocity, friction), true);
  controls.registerMethod('downElement',  new Marzipano.ElementPressControlMethod(viewDownElement,   'y',  velocity, friction), true);
  controls.registerMethod('leftElement',  new Marzipano.ElementPressControlMethod(viewLeftElement,   'x', -velocity, friction), true);
  controls.registerMethod('rightElement', new Marzipano.ElementPressControlMethod(viewRightElement,  'x',  velocity, friction), true);
  controls.registerMethod('inElement',    new Marzipano.ElementPressControlMethod(viewInElement,  'zoom', -velocity, friction), true);
  controls.registerMethod('outElement',   new Marzipano.ElementPressControlMethod(viewOutElement, 'zoom',  velocity, friction), true);
// Associate view controls with keyboard
  controls.enableMethodGroup('arrowKeys');


  // SceneList Menu Keyboard accessible - MAPS
  var MapsToggle = document.querySelector('#maps-toggle');
  var Maps = document.querySelector('#maps');

  if (MapsToggle){
    console.log('Found a ' + MapsToggle +'element');
    MapsToggle.addEventListener('click', function(event) {
      expandMapsMenu();
    });
  } else {
    console.log('Did not found any maps-toggle')
  };

  // SceneList Menu Keyboard accessible - OUTDOORS
  var OutdoorsToggle = document.querySelector('#outdoors-toggle');
  var Outdoors = document.querySelector('#outdoors');

  if (OutdoorsToggle){
    console.log('Found a ' + OutdoorsToggle +'element');
    OutdoorsToggle.addEventListener('click', function(event) {
      expandOutdoorsMenu();
    });
  } else {
    console.log('Did not found any outdoors-toggle')
  };

  // SceneList Menu Keyboard accessible - HAMISH
  var HamishToggle = document.querySelector('#hamish-toggle');
  var Hamish = document.querySelector('#hamish');

  if (HamishToggle){
    console.log('Found a ' + HamishToggle +'element');
    HamishToggle.addEventListener('click', function(event) {
      expandHamishMenu();
    });
  } else {
    console.log('Did not found any hamish-toggle')
  };

  // SceneList Menu Keyboard accessible - GEORGE
  var GeorgeToggle = document.querySelector('#george-toggle');
  var George = document.querySelector('#george');

  if (GeorgeToggle){
    console.log('Found a ' + GeorgeToggle +'element');
    GeorgeToggle.addEventListener('click', function(event) {
      expandGeorgeMenu();
    });
  } else {
    console.log('Did not found any george-toggle')
  };

  // SceneList Menu Keyboard accessible - GEORGELAB
  var GeorgelabToggle = document.querySelector('#georgelab-toggle');
  var Georgelab = document.querySelector('#georgelab');

  if (GeorgelabToggle){
    console.log('Found a ' + GeorgelabToggle +'element');
    GeorgelabToggle.addEventListener('click', function(event) {
      expandGeorgelabMenu();
    });
  } else {
    console.log('Did not found any georgelab-toggle')
  };

  // SceneList Menu Keyboard accessible - CHARLES
  var CharlesToggle = document.querySelector('#charles-toggle');
  var Charles = document.querySelector('#charles');

  if (CharlesToggle){
    console.log('Found a ' + CharlesToggle +'element');
    CharlesToggle.addEventListener('click', function(event) {
      expandCharlesMenu();
    });
  } else {
    console.log('Did not found any charles-toggle')
  };

  // SceneList Menu Keyboard accessible - GOVAN
  var GovanToggle = document.querySelector('#govan-toggle');
  var Govan = document.querySelector('#govan');

  if (GovanToggle){
    console.log('Found a ' + GovanToggle +'element');
    GovanToggle.addEventListener('click', function(event) {
      expandGovanMenu();
    });
  } else {
    console.log('Did not found any govan-toggle')
  };

  // SceneList Menu Keyboard accessible - MILTON
  var MiltonToggle = document.querySelector('#milton-toggle');
  var Milton = document.querySelector('#milton');

  if (MiltonToggle){
    console.log('Found a ' + MiltonToggle +'element');
    MiltonToggle.addEventListener('click', function(event) {
      expandMiltonMenu();
    });
  } else {
    console.log('Did not found any Milton-toggle')
  };

  // SceneList Menu Keyboard accessible - LIBRARY
  var LibraryToggle = document.querySelector('#library-toggle');
  var Library = document.querySelector('#library');

  if (LibraryToggle){
    console.log('Found a ' + LibraryToggle +'element');
    LibraryToggle.addEventListener('click', function(event) {
      expandLibraryMenu();
    });
  } else {
    console.log('Did not found any library-toggle')
  };

  // SceneList Menu Keyboard accessible - STUDENT
  var StudentToggle = document.querySelector('#student-toggle');
  var Student = document.querySelector('#student');

  if (StudentToggle){
    console.log('Found a ' + StudentToggle +'element');
    StudentToggle.addEventListener('click', function(event) {
      expandStudentMenu();
    });
  } else {
    console.log('Did not found any student-toggle')
  };
  
  // SceneList Menu Keyboard accessible - GYM
  var GymToggle = document.querySelector('#gym-toggle');
  var Gym = document.querySelector('#gym');

  if (GymToggle){
    console.log('Found a ' + GymToggle +'element');
    GymToggle.addEventListener('click', function(event) {
      expandGymMenu();
    });
  } else {
    console.log('Did not found any gym-toggle')
  };

  // SceneList Menu Keyboard accessible - CEE
  var CeeToggle = document.querySelector('#cee-toggle');
  var Cee = document.querySelector('#cee');

  if (CeeToggle){
    console.log('Found a ' + CeeToggle +'element');
    CeeToggle.addEventListener('click', function(event) {
      expandCeeMenu();
    });
  } else {
    console.log('Did not found any cee-toggle')
  };

  // SceneList Menu Keyboard accessible - CALEY
  var CaleyToggle = document.querySelector('#caley-toggle');
  var Caley = document.querySelector('#caley');

  if (CaleyToggle){
    console.log('Found a ' + CaleyToggle +'element');
    CaleyToggle.addEventListener('click', function(event) {
      expandCaleyMenu();
    });
  } else {
    console.log('Did not found any caley-toggle')
  };

    

  function sanitize(s) {
    return s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;');
  }

  function switchScene(scene) {
    stopAutorotate();
    removeElementIframspot("iframespot");
    scene.view.setParameters(scene.data.initialViewParameters);
    scene.scene.switchTo();
    stopAutorotate();
    updateSceneName(scene);
    updateSceneList(scene);
     
  }

  function removeElementIframspot(){
    var delete_elements = document.getElementsByClassName("iframespot");
  
    while (delete_elements.length>0){
      delete_elements[0].parentNode.removeChild(delete_elements[0]);
    }
  }

  function addElementIframspot(hotspot){
    
    var videowrapper = document.getElementsByClassName('video-hotspot-text');

    while (videowrapper.length>0){
      var wrapper = document.getElementsByClassName('video-hotspot');
      var videowrapper = document.getElementsByClassName('video-hotspot-text');
      var video = document.createElement('div');
      
      video.classList.add('iframespot');
      video.innerHTML = '<iframe width="340" height="170" src=""></iframe>"';
    }; 
  }

  function updateSceneName(scene) {
    sceneNameElement.innerHTML = sanitize(scene.data.name);
  }

  function updateSceneList(scene) {
    for (var i = 0; i < sceneElements.length; i++) {
      var el = sceneElements[i];
      if (el.getAttribute('data-id') === scene.data.id) {
        el.classList.add('current');
      } else {
        el.classList.remove('current');
      }
    }
  }

  function showSceneList() {
    sceneListElement.classList.add('enabled');
    sceneListToggleElement.classList.add('enabled');
  }

  function hideSceneList() {
    sceneListElement.classList.remove('enabled');
    sceneListToggleElement.classList.remove('enabled');
  }

  function toggleSceneList() {
    sceneListElement.classList.toggle('enabled');
    sceneListToggleElement.classList.toggle('enabled');
  }

// Functions for sceneView Toggle: showSceneToggle,  hideScene
  // function showSceneView() {
  //   sceneViewElement.classList.add('enabled');
  //   sceneViewToggleElement.classList.add('enabled');
  // }

  // function hideSceneView() {
  //   sceneViewElement.classList.remove('enabled');
  //   sceneViewToggleElement.classList.remove('enabled');
  // }

  // function toggleSceneView() {
  //   sceneViewElement.classList.toggle('enabled');
  //   sceneViewToggleElement.classList.toggle('enabled');
  // }

  function toggleSidebar(){
    document.getElementById("sceneList").classList.toggle('active');
  }

  function startAutorotate() {
    if (!autorotateToggleElement.classList.contains('enabled')) {
      return;
    }
    viewer.startMovement(autorotate);
    viewer.setIdleMovement(3000, autorotate);
  }

  function stopAutorotate() {
    viewer.stopMovement();
    viewer.setIdleMovement(Infinity);
  }

  function toggleAutorotate() {
    if (autorotateToggleElement.classList.contains('enabled')) {
      autorotateToggleElement.classList.remove('enabled');
      stopAutorotate();
    } else {
      autorotateToggleElement.classList.add('enabled');
      startAutorotate();
    }
  }

  function expandMapsMenu() {

    var MapsOpen = Maps.classList.contains("active");
    var newMenuOpenStatus = !MapsOpen;

    MapsToggle.setAttribute("aria-expanded", newMenuOpenStatus);
    Maps.classList.toggle("active");
  }
  
  function expandOutdoorsMenu() {

    var OutdoorsOpen = Outdoors.classList.contains("active");
    var newMenuOpenStatus = !OutdoorsOpen;

    OutdoorsToggle.setAttribute("aria-expanded", newMenuOpenStatus);
    Outdoors.classList.toggle("active");
  }

  function expandHamishMenu() {

    var HamishOpen = Hamish.classList.contains("active");
    var newMenuOpenStatus = !HamishOpen;

    HamishToggle.setAttribute("aria-expanded", newMenuOpenStatus);
    Hamish.classList.toggle("active");
  }

  function expandGeorgeMenu() {

    var GeorgeOpen = George.classList.contains("active");
    var newMenuOpenStatus = !GeorgeOpen;

    GeorgeToggle.setAttribute("aria-expanded", newMenuOpenStatus);
    George.classList.toggle("active");
  }

  function expandGeorgelabMenu() {

    var GeorgelabOpen = Georgelab.classList.contains("active");
    var newMenuOpenStatus = !GeorgelabOpen;

    GeorgelabToggle.setAttribute("aria-expanded", newMenuOpenStatus);
    Georgelab.classList.toggle("active");
  }

  function expandCharlesMenu() {

    var CharlesOpen = Charles.classList.contains("active");
    var newMenuOpenStatus = !CharlesOpen;

    CharlesToggle.setAttribute("aria-expanded", newMenuOpenStatus);
    Charles.classList.toggle("active");
  }

  function expandGovanMenu() {

    var GovanOpen = Govan.classList.contains("active");
    var newMenuOpenStatus = !GovanOpen;

    GovanToggle.setAttribute("aria-expanded", newMenuOpenStatus);
    Govan.classList.toggle("active");
  }

  function expandMiltonMenu() {

    var MiltonOpen = Milton.classList.contains("active");
    var newMenuOpenStatus = !MiltonOpen;

    MiltonToggle.setAttribute("aria-expanded", newMenuOpenStatus);
    Milton.classList.toggle("active");
  }

  function expandLibraryMenu() {

    var LibraryOpen = Library.classList.contains("active");
    var newMenuOpenStatus = !LibraryOpen;

    LibraryToggle.setAttribute("aria-expanded", newMenuOpenStatus);
    Library.classList.toggle("active");
  }

  function expandStudentMenu() {

    var StudentOpen = Student.classList.contains("active");
    var newMenuOpenStatus = !StudentOpen;

    StudentToggle.setAttribute("aria-expanded", newMenuOpenStatus);
    Student.classList.toggle("active");
  }

  function expandGymMenu() {

    var GymOpen = Gym.classList.contains("active");
    var newMenuOpenStatus = !GymOpen;

    GymToggle.setAttribute("aria-expanded", newMenuOpenStatus);
    Gym.classList.toggle("active");
  }

  function expandCeeMenu() {

    var CeeOpen = Cee.classList.contains("active");
    var newMenuOpenStatus = !CeeOpen;

    CeeToggle.setAttribute("aria-expanded", newMenuOpenStatus);
    Cee.classList.toggle("active");
  }

  function expandCaleyMenu() {

    var CaleyOpen = Caley.classList.contains("active");
    var newMenuOpenStatus = !CaleyOpen;

    CaleyToggle.setAttribute("aria-expanded", newMenuOpenStatus);
    Caley.classList.toggle("active");
  }

  

  function createMapLinkHotspotElement(hotspot) {

    // Create wrapper element to hold icon and tooltip.
    var wrapper = document.createElement('div');
    wrapper.classList.add('hotspot');
    wrapper.classList.add('maplink-hotspot');

    // Create image element.
    var icon = document.createElement('img');
    icon.src = 'img/maplink.png';
    icon.classList.add('maplink-hotspot-icon');
    icon.setAttribute('alt','Map Hotspot link icon');


    // Create number element.
    var number = document.createElement('button');
    number.classList.add('maplink-hotspot-number');
    number.setAttribute('alt','Map Hotspot link button');
    number.innerHTML = hotspot.text;
    

    // Set rotation transform.
    var transformProperties = [ '-ms-transform', '-webkit-transform', 'transform' ];
    for (var i = 0; i < transformProperties.length; i++) {
      var property = transformProperties[i];
      icon.style[property] = 'rotate(' + hotspot.rotation + 'rad)';
    }

    // Add click event handler.
    wrapper.addEventListener('click', function() {
      switchScene(findSceneById(hotspot.target));
    });

    // Prevent touch and scroll events from reaching the parent element.
    // This prevents the view control logic from interfering with the hotspot.
    stopTouchAndScrollEventPropagation(wrapper);

    // Create tooltip element.
    var tooltip = document.createElement('div');
    tooltip.classList.add('hotspot-tooltip');
    tooltip.classList.add('maplink-hotspot-tooltip');
    tooltip.innerHTML = findSceneDataById(hotspot.target).name;

    wrapper.appendChild(number);
    wrapper.appendChild(icon);
    wrapper.appendChild(tooltip);

    return wrapper;
  }

  function createLinkHotspotElement(hotspot) {

    // Create wrapper element to hold icon and tooltip.
    var wrapper = document.createElement('div');
    wrapper.classList.add('hotspot');
    wrapper.classList.add('link-hotspot');

    // Create image element.
    var icon = document.createElement('img');
    icon.src = 'img/link.png';
    icon.classList.add('link-hotspot-icon');
    icon.setAttribute('alt','Link Hotspot icon');

    //create 
    var iconWrapper = document.createElement('button');
    iconWrapper.classList.add('link-hotspot-icon-wrapper');
    iconWrapper.setAttribute('alt','Link Hotspot button');

    // Set rotation transform.
    var transformProperties = [ '-ms-transform', '-webkit-transform', 'transform' ];
    for (var i = 0; i < transformProperties.length; i++) {
      var property = transformProperties[i];
      icon.style[property] = 'rotate(' + hotspot.rotation + 'rad)';
    }

    // Add click event handler.
    wrapper.addEventListener('click', function() {
      switchScene(findSceneById(hotspot.target));
    });

    // Prevent touch and scroll events from reaching the parent element.
    // This prevents the view control logic from interfering with the hotspot.
    stopTouchAndScrollEventPropagation(wrapper);

    // Create tooltip element.
    var tooltip = document.createElement('div');
    tooltip.classList.add('hotspot-tooltip');
    tooltip.classList.add('link-hotspot-tooltip');
    tooltip.innerHTML = findSceneDataById(hotspot.target).name;

    wrapper.appendChild(iconWrapper);
    wrapper.appendChild(icon);
    wrapper.appendChild(tooltip);

    return wrapper;
  }

  function createInfoHotspotElement(hotspot) {

    // Create wrapper element to hold icon and tooltip.
    var wrapper = document.createElement('div');
    wrapper.classList.add('hotspot');
    wrapper.classList.add('info-hotspot');

    // Create hotspot/tooltip header.
    var header = document.createElement('div');
    header.classList.add('info-hotspot-header');

    
    // Create image wrapper element.
    var iconWrapper = document.createElement('button');
    iconWrapper.classList.add('info-hotspot-icon-wrapper');
    iconWrapper.setAttribute('alt','Info Hotspot button');

    // Create image element.
    var icon = document.createElement('img');
    icon.src = 'img/info.png';
    icon.classList.add('info-hotspot-icon');
    iconWrapper.appendChild(icon);
    icon.setAttribute('alt','Info Hotspot icon');

    // Create title element.
    var titleWrapper = document.createElement('div');
    titleWrapper.classList.add('info-hotspot-title-wrapper');
    var title = document.createElement('div');
    title.classList.add('info-hotspot-title');
    title.innerHTML = hotspot.title;
    titleWrapper.appendChild(title);

    // Create close element.
    var closeWrapper = document.createElement('div');
    closeWrapper.classList.add('info-hotspot-close-wrapper');
    closeWrapper.setAttribute("id", "pause")
    var closeIcon = document.createElement('img');
    closeIcon.src = 'img/close.png';
    closeIcon.classList.add('info-hotspot-close-icon');
    closeWrapper.appendChild(closeIcon);

    // Construct header element.
    header.appendChild(iconWrapper);
    header.appendChild(titleWrapper);
    header.appendChild(closeWrapper);

    // Create text element.
    var text = document.createElement('div');
    text.classList.add('info-hotspot-text');
    text.innerHTML = hotspot.text;

    // Place header and text into wrapper element.
    wrapper.appendChild(header);
    wrapper.appendChild(text);

    // Create a modal for the hotspot content to appear on mobile mode.
    var modal = document.createElement('div');
    modal.innerHTML = wrapper.innerHTML;
    modal.classList.add('info-hotspot-modal');
    document.body.appendChild(modal);

    var toggle = function() {
      wrapper.classList.toggle('visible');
      modal.classList.toggle('visible');

    };

    // Show content when hotspot is clicked.
    wrapper.querySelector('.info-hotspot-header').addEventListener('click', toggle);

    // Hide content when close icon is clicked.
    modal.querySelector('.info-hotspot-close-wrapper').addEventListener('click', toggle);

    // Prevent touch and scroll events from reaching the parent element.
    // This prevents the view control logic from interfering with the hotspot.
    stopTouchAndScrollEventPropagation(wrapper);
    //console.log(wrapper);

    return wrapper;
  }

  //Create VIDEO Hotspot Element
  function createVideoHotspotElement(hotspot) {

    // Create wrapper element to hold icon and tooltip.
    var wrapper = document.createElement('div');
    wrapper.classList.add('hotspot');
    wrapper.classList.add('video-hotspot');

    // Create hotspot/tooltip header.
    var header = document.createElement('div');
    header.classList.add('video-hotspot-header');

    // Create image wrapper element.
    var iconWrapper = document.createElement('button');
    iconWrapper.classList.add('video-hotspot-icon-wrapper');
    iconWrapper.setAttribute('alt','Video Hotspot icon');

    // Create image element.
    var icon = document.createElement('img');
    icon.src = 'img/video.png';
    icon.classList.add('video-hotspot-icon');
    iconWrapper.appendChild(icon);
    icon.setAttribute('alt','Video Hotspot icon');

    // Create title element.
    var titleWrapper = document.createElement('div');
    titleWrapper.classList.add('video-hotspot-title-wrapper');
    var title = document.createElement('div');
    title.classList.add('video-hotspot-title');
    title.innerHTML = hotspot.title;
    titleWrapper.appendChild(title);

    // Create close element.
    var closeWrapper = document.createElement('button');
    closeWrapper.classList.add('video-hotspot-close-wrapper');
    var closeIcon = document.createElement('img');
    closeIcon.src = 'img/close.png';
    closeIcon.classList.add('video-hotspot-close-icon');
    closeWrapper.appendChild(closeIcon);

    // Construct header element.
    header.appendChild(iconWrapper);
    header.appendChild(titleWrapper);
    header.appendChild(closeWrapper);

    // // Create text element.
    var videowrapper = document.createElement('div');
    videowrapper.classList.add('video-hotspot-text');
    var video = document.createElement('div');
    // DELETE so video stops playing: videowrapper.appendChild(video);

    
    // Place header and text into wrapper element.
    wrapper.appendChild(header);
    wrapper.appendChild(videowrapper); 

    // Create a modal for the hotspot content to appear on mobile mode.
    var modal = document.createElement('div');
    modal.innerHTML = wrapper.innerHTML;
    modal.classList.add('video-hotspot-modal');
    document.body.appendChild(modal);


    function startModal(videowrapper) {
      if (!modal.classList.toggle('visible')) {
        return;
      }
     
      wrapper.appendChild(header);
      wrapper.appendChild(videowrapper);

      var modal2 = document.createElement('div');
      modal2.innerHTML = wrapper.innerHTML;
      modal2.classList.add('video-hotspot-modal');
      document.body.appendChild(modal2);

      modal2.classList.toggle('visible');
    }


    var toggle = (function() {
      // when visible add video class and innerHTML
      video.classList.add('iframespot');
      video.innerHTML = '<iframe width="340" height="170" src="' + hotspot.text + '"></iframe>"';
      videowrapper.appendChild(video);
 
      wrapper.classList.toggle('visible');

      startModal(videowrapper);

    })

    

    // Show content when hotspot is clicked.
    wrapper.querySelector('.video-hotspot-header').addEventListener('click', toggle);

    // Hide content when close icon is clicked.
    modal.querySelector('.video-hotspot-close-wrapper').addEventListener('click', toggle);


    // Prevent touch and scroll events from reaching the parent element.
    // This prevents the view control logic from interfering with the hotspot.
    stopTouchAndScrollEventPropagation(wrapper);
    //console.log(wrapper);

    return wrapper;
  }

  // Prevent touch and scroll events from reaching the parent element.
  function stopTouchAndScrollEventPropagation(element, eventList) {
    var eventList = [ 'touchstart', 'touchmove', 'touchend', 'touchcancel',
                      'wheel', 'mousewheel' ];
    for (var i = 0; i < eventList.length; i++) {
      element.addEventListener(eventList[i], function(event) {
        event.stopPropagation();
      });
    }
  }


  function findSceneById(id) {
    for (var i = 0; i < scenes.length; i++) {
      if (scenes[i].data.id === id) {
        return scenes[i];
      }
    }
    return null;
  }

  function findSceneDataById(id) {
    for (var i = 0; i < data.scenes.length; i++) {
      if (data.scenes[i].id === id) {
        return data.scenes[i];
      }
    }
    return null;
  }


  // Display the initial scene.
  switchScene(scenes[0]);


  // Added for XAPI add a new function that accepts two parameters ***NEW***
  function sendxAPI(TheeEvent,TheVerb,TheObject){
    
    var statement = '';
    statement = new TinCan.Statement({
      "actor": {  
        "mbox": "student_name@example.com",  
        "name": "Student Name",  
        "objectType": "Agent" 
      },
      "verb": {  
        "id": TheVerb.id, 
        "display": { "en-US": TheVerb.display["en-US"] }
      },
      "object": {  
        "id": TheObject.id,
        "definition": {
          "name": { "en-US": TheObject.definition_name },
          "description": {"en-US": TheObject.definition_description}
        }
      },
      "target": {
        "id": "http://rusticisoftware.github.com/TinCanJS"}
      }
    );

    var lrs;
    try {
      lrs = new TinCan.LRS(
        {
          "endpoint" : "https://trial-lrs.yetanalytics.io/xapi/",  
          "auth" : "Basic " + toBase64 ("username:password")  
        }
      );
    }

    catch (ex) {
      console.log("Failed to setup LRS object: ", ex);
      // TODO: do something with error, can't communicate with LRS
    }


    lrs.saveStatement(
      statement,
      {
        callback: function (err, xhr) {
          if (err !== null) {
            if (xhr !== null) {
              console.log("Failed to save statement: " + xhr.responseText + " (" + xhr.status + ")");
              return;
            }
            console.log("Failed to save statement: " + err);
            return;
          }
          // TODO: do something with success (possibly ignore)
          console.log("Statement saved");
    }    
    });

     
  }

   

})();
