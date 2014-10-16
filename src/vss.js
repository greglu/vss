$(function() {
  var CSS_URL = 'http://vss.greg.lu/vss.min.css';
  var SAVE_PREFIX = 'vss-' + $('#item_suitModel :selected').val() + '::';

  var CONTAINER = $('#content');

  // panels that are eligible for saving to VSS
  var SERIALIZABLE_CONTAINER = CONTAINER.find('#panel_options,#panel_measurements');

  var CONTAINER_OPTIONS_SELECTOR = '#panel_options';
  var CONTAINER_OPTIONS = $(CONTAINER_OPTIONS_SELECTOR);

  var VSS_DESIGNS_DOMID = 'vss-designs';

  // ----- Utilities ----- //

  /**
   * Adapted from paulund's jQuery modal box plugin
   * Author: Paul Underwood
   * URL: http://www.paulund.co.uk
   * Available for free download from http://www.paulund.co.uk
   */
  function modalBox(prop) {
    var options = $.extend({
      title: "Share Your Design",
      description: "",
    }, prop);

    function add_block_page() {
      var block_page = $('<div class="paulund_block_page"></div>');
      // Clicking outside the modal box will close it
      block_page.click(function(ev) {
        ev.stopImmediatePropagation();
        $(this).fadeOut().remove();
      });
      block_page.appendTo('body');
    }

    function add_popup_box() {
      var pop_up = $('<div class="paulund_modal_box"><a href="#" class="paulund_modal_close"></a><div class="paulund_inner_modal_box"><h2>' + options.title + '</h2>' + options.description + '</div></div>');
      // Prevents clicks inside the modal box from closing it
      pop_up.click(function(ev) {
        ev.stopPropagation();
      });
      pop_up.appendTo('.paulund_block_page');

      $('.paulund_modal_close').click(function() {
        $(this).parent().fadeOut().remove();
        $('.paulund_block_page').fadeOut().remove();
      });
    }

    add_block_page();
    add_popup_box();
    $('.paulund_modal_box').fadeIn();
    return this;
  }

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
    $.each(SERIALIZABLE_CONTAINER.find('input:checked'), function(k,v) {
      checkedItems.push(v.id);
    });

    var textItems = {};
    $.each(SERIALIZABLE_CONTAINER.find('input[type=text],textarea'), function(k,v) {
      if (v.value) {
        textItems[v.id] = v.value;
      }
    });

    var selectedOptionItems = {};
    $.each(SERIALIZABLE_CONTAINER.find('select'), function(k,v) {
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
      $.each(SERIALIZABLE_CONTAINER.find('input[type=text],textarea'), function(k,v) {
        $(v).val('');
      });
      $.each(SERIALIZABLE_CONTAINER.find('input:checked'), function(k,v) {
        $(v).prop('checked', false);
      });
      // Skip the VSS design list, which is a select form
      $.each(SERIALIZABLE_CONTAINER.find('select[id!=' + VSS_DESIGNS_DOMID + ']'), function(k,v) {
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
    var saveButton = $('<button>Save Current Design</button>');
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

      var output = '<div>Copy the link below, and share it with your friends</div>' +
        '<div><strong>NOTE:</strong> only suit options, and measurements are shared</div>' +
        '<div><input type="text" size="75" value="' + shareLink.href + '"></div>';

      modalBox({ description: output });

      return false;
    });
    return shareButton;
  }

  function init() {
    var hashString = window.location.hash.replace(/^#/, '');
    if (hashString.length > 0) {
      var serializedState = decodeURIComponent(hashString);

      var deserializedState;
      try {
        deserializedState = JSON.parse(serializedState);
      } catch (err) {
      }
      if (deserializedState) {
        console.log('Detected shared design. Attempting to load...');
        restoreState(deserializedState, true);
      }
    }

    // load the stylesheet if it hasn't been loaded yet
    var alreadyLoaded = false;
    $('link').each(function(k, link) {
      var href = $(link).attr('href');
      if (href.indexOf('vss.css') !== -1 || href.indexOf('vss.min.css') !== -1) {
        alreadyLoaded = true;
      }
    });

    if (!alreadyLoaded) {
      var styleSheet = document.createElement("link");
      styleSheet.setAttribute("rel", "stylesheet");
      styleSheet.setAttribute("type", "text/css");
      styleSheet.setAttribute("href", CSS_URL);
      document.body.appendChild(styleSheet);
    }
  }

  if (isRunnable()) {
    var designList = initializeDesignList(VSS_DESIGNS_DOMID);
    var deleteButton = initializeDeleteButton(designList);
    var saveButton = initializeSaveButton(designList);
    var shareButton = initializeShareButton();

    // This is where the ordering of the button happens
    var vssWrapper = $('<div id="vss" class="form_submit clearfix">')
      .append(saveButton)
      .append(shareButton)
      .append(designList)
      .append(deleteButton);

    $('#content .form_submit').before(vssWrapper);

    init();
  } else {
    alert('Vertical Suit Saver seems to be out-of-date. Womp womp.');
  }
});
