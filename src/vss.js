(function() {
  var SAVE_PREFIX = 'vss-' + $('#item_suitModel :selected').val() + '::';

  var CONTAINER = $('#content');

  var CONTAINER_OPTIONS_SELECTOR = '#panel_options';
  var CONTAINER_OPTIONS = $(CONTAINER_OPTIONS_SELECTOR);

  // ----- Utilities ----- //

  function isRunnable() {
    if (!$) {
      return false;
    }
    if (!('localStorage' in window && window.localStorage !== null)) {
      return false;
    }
    if (CONTAINER.length === 0 || CONTAINER_OPTIONS.length === 0) {
      return false;
    }
    return true;
  }

  function getDesignName(name) {
    if (name && name.indexOf(SAVE_PREFIX) === 0) {
      return name.substring(SAVE_PREFIX.length, name.length);
    } else {
      return name;
    }
  }

  function getSaveName(name) {
    return SAVE_PREFIX + getDesignName(name);
  }

  function triggerContainerEvent(incomingTarget) {
    if (incomingTarget) {
      var $target = $(incomingTarget);
      var target = $target[0];

      // We need to trigger both on the target, and on the
      // container as a delegate listener
      $target.triggerHandler('change');

      if ($target.parents(CONTAINER_OPTIONS_SELECTOR)) {
        var triggerEvent = $.Event('change');
        triggerEvent.target = target;
        CONTAINER_OPTIONS.trigger(triggerEvent);
      }
    }
  }

  // ----- State saving/restoring ----- //

  function serializeCurrentState() {
    var checkedItems = [];
    $.each(CONTAINER.find('input:checked'), function(k,v) {
      checkedItems.push(v.id);
    });

    var textItems = {};
    $.each(CONTAINER.find('input[type=text],textarea'), function(k,v) {
      if (v.value) {
        textItems[v.id] = v.value;
      }
    });

    var selectedOptionItems = {};
    $.each(CONTAINER.find('select'), function(k,v) {
      var selectedVal = $(v).find('option:selected').val();
      if (selectedVal) {
        selectedOptionItems[v.id] = selectedVal;
      }
    });

    var state = {
      checkedItems: checkedItems,
      textItems: textItems,
      selectedOptionItems: selectedOptionItems
    };

    return JSON.stringify(state);
  }

  function restoreState(state, isParsed) {
    if (!state) {
      return;
    }

    state = (isParsed ? state : JSON.parse(state));

    if (state) {
      // Resetting all fields
      $.each(CONTAINER.find('input[type=text],textarea'), function(k,v) {
        $(v).val('');
      });
      $.each(CONTAINER.find('input:checked'), function(k,v) {
        $(v).prop('checked', false);
      });
      $.each(CONTAINER.find('select'), function(k,v) {
        v.selectedIndex = 0;
        triggerContainerEvent(v);
      });

      // Now restoring all fields
      $.each(state.textItems, function(inputId, textValue) {
        $('#' + inputId).val(textValue);
      });

      $.each(state.checkedItems, function(k, inputId) {
        var target = $('#' + inputId);
        if (target) {
          target.prop('checked', true);
          triggerContainerEvent(target);
        }
      });

      $.each(state.selectedOptionItems, function(selectId, optionVal) {
        var target = $('#' + selectId);
        if (target) {
          target.val(optionVal);
          triggerContainerEvent(target);
        }
      });

      // Execute a recalculation on the price
      vsuit.calc();
    }
  }

  // ----- Saved design listing/loading/deleting ----- //

  function retrieveSavedDesigns() {
    var savedDesigns = [];
    $.map(localStorage, function(v,k) {
      if (k.indexOf(SAVE_PREFIX) === 0) {
        savedDesigns.push(getDesignName(k));
      }
    });
    return savedDesigns;
  }

  function loadDesign(designName) {
    if (designName) {
      var saveName = getSaveName(designName);
      var serializedState = localStorage.getItem(saveName);

      if (serializedState) {
        restoreState(serializedState);
      } else {
        console.log('No saved design found for name: ' + designName);
      }
    }
  }

  function saveDesign(designName) {
    if (designName) {
      console.log('Saving: ' + getSaveName(designName));
      localStorage.setItem(getSaveName(designName), serializeCurrentState());
      return true;
    }
    return false;
  }

  function deleteDesign(designName) {
    if (designName) {
      localStorage.removeItem(getSaveName(designName));
    }
  }

  // ----- Main controls ----- //

  function initializeDesignList(domIdName) {
    var designList = $('<select>Load Design</select>')
      .attr('id', domIdName);

    designList.append(
      $('<option>', { value: '', selected: 'selected' })
        .text('-- Load Saved Design --')
    );

    $.each(retrieveSavedDesigns(), function(k, v) {
      addDesignListEntry(designList, v);
    });

    designList.change(function(ev) {
      var selectedDesign = $(this).find(':selected').val();
      if (selectedDesign) {
        console.log('Loading design: ' + selectedDesign);
        loadDesign(selectedDesign);
      }
      return false;
    });

    return designList;
  }

  function addDesignListEntry(designList, designName) {
    if (designName) {
      designList.append($('<option>', { value: designName }).text(designName));
    }
  }

  function initializeDeleteButton(designList) {
    var deleteButton = $('<button>Delete</button>');
    deleteButton.click(function(ev) {
      var selectedDesign = designList.find(':selected').val();
      if (selectedDesign && confirm('Are you sure you want to delete: ' + selectedDesign)) {
        console.log('Deleting design: ' + selectedDesign);
        deleteDesign(selectedDesign);
        designList.find('option[value=' + selectedDesign + ']').remove();
      }
      return false;
    });
    return deleteButton;
  }

  function initializeSaveButton(designList) {
    var saveButton = $('<button>Save Current</button>');
    saveButton.click(function(ev) {
      var selectedDesign = $(designList).find(':selected').val();
      var defaultName = selectedDesign || (new Date()).toLocaleString();
      var designName = prompt('Name this design!', defaultName);
      if (saveDesign(designName)) {
        addDesignListEntry(designList, designName);
      }
      return false;
    });
    return saveButton;
  }

  function initializeShareButton() {
    var shareButton = $('<button>Share</button>');
    shareButton.click(function(ev) {
      ev.preventDefault();
      var state = serializeCurrentState();
      var shareLink = document.createElement('a');
      shareLink.href = document.URL;
      shareLink.hash = encodeURIComponent(state);

      prompt("Copy the link below, and share it with your friends. Make sure they're also running VSS.\n\n" +
        "NOTE: all information entered gets shared, including contact information!",
        shareLink.href);

      return false;
    });
    return shareButton;
  }

  function init() {
    var hashString = window.location.hash.replace(/^#/, '');
    if (hashString.length > 0) {
      console.log('Detected shared design. Attempting to load...');
      var serializedState = decodeURIComponent(hashString);
      var deserializedState = JSON.parse(serializedState);
      if (deserializedState) {
        restoreState(deserializedState, true);
      }
    }

    var styleSheet =document.createElement("link");
    styleSheet.setAttribute("rel", "stylesheet");
    styleSheet.setAttribute("type", "text/css");
    styleSheet.setAttribute("href", 'http://localhost:8000/vss.css');
    document.body.appendChild(styleSheet);
  }

  if (isRunnable()) {
    var designList = initializeDesignList('vss-designs');
    var deleteButton = initializeDeleteButton(designList);
    var saveButton = initializeSaveButton(designList);
    var shareButton = initializeShareButton();

    var vssWrapper = $('<div id="vss" class="wrapper">')
      .append(designList)
      .append(deleteButton)
      .append(saveButton)
      .append(shareButton);

    $('.suit_selector').append(vssWrapper);

    init();
  } else {
    alert('Vertical Suit Saver seems to be out-of-date. Womp womp.');
  }
})();
