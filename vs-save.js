(function() {
  var SAVE_PREFIX = 'vss-' + $('#item_suitModel :selected').val() + '-';
  var CONTAINER = $('#panel_options');
  var BUTTON_STYLE = {
    // copied from verticalsuits.css
    "vertical-align": "top",
    "font-size": "22px",
    "margin": "0 0 0 10px",
    "min-width": "120px",
    "color": "#fff",
    "background": "#666",
    "border": "none",
    "font-size": "17px",
    "margin-top": "1px",
    "width": "auto",
    // custom styling
    "float": "left",
    "border-radius": "5px"
  };

  // ----- Utilities ----- //

  function isRunnable() {
    if (!$) {
      return false;
    }
    if (!('localStorage' in window && window['localStorage'] !== null)) {
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

  function restoreState(serializedState) {
    if (!serializedState) {
      return;
    }

    var state = JSON.parse(serializedState);

    if (state) {
      // Resetting all fields
      $.each(CONTAINER.find('input[type=text]'), function(k,v) {
        $(v).val('');
      });
      $.each(CONTAINER.find('input:checked'), function(k,v) {
        $(v).prop('checked', false);
      });

      // Now restoring
      $.each(state.textItems, function(inputId, textValue) {
        $('#' + inputId).val(textValue);
      });

      $.each(state.checkedItems, function(k, inputId) {
        var target = $('#' + inputId);
        if (target) {
          target.prop('checked', true);
          var clickEvent = $.Event('change');
          clickEvent.target = target[0];
          CONTAINER.trigger(clickEvent);
        }
      });

      $.each(state.selectedOptionItems, function(selectId, optionVal) {
        var target = $('#' + selectId);
        if (target) {
          target.val(optionVal);
          var clickEvent = $.Event('change');
          clickEvent.target = target[0];
          CONTAINER.trigger(clickEvent);
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

  function deleteDesign(designName) {
    if (designName) {
      localStorage.removeItem(getSaveName(designName));
    }
  }

  // ----- Main controls ----- //

  function initializeDesignList(domIdName) {
    var designList = $('<select>Load Design</select>')
      .attr('id', domIdName)
      .css({'margin-left': '20px', 'float': 'left'});

    designList.append(
      $('<option>', { value: '', selected: 'selected' })
        .text('-- Load Saved Design --')
    );

    $.each(retrieveSavedDesigns(), function(k, v) {
      addDesignListEntry(designList, v);
      // designList.append($('<option>', { value: v }).text(v));
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
    var deleteButton = $('<button>Delete Design</button>').css(BUTTON_STYLE);
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
    var saveButton = $('<button>Save New Design</button>').css(BUTTON_STYLE);
    saveButton.click(function(ev) {
      var designName = prompt("Enter a name for this design", (new Date()).toLocaleString());
      if (designName) {
        console.log('Saving: ' + getSaveName(designName));
        localStorage.setItem(getSaveName(designName), serializeCurrentState());
        addDesignListEntry(designList, designName);
      }
      return false;
    });
    return saveButton;
  }

  if (isRunnable()) {
    var designList = initializeDesignList('vss-designs');
    var deleteButton = initializeDeleteButton(designList);
    var saveButton = initializeSaveButton(designList);

    $('.suit_selector .wrapper .total')
      .before(designList)
      .before(deleteButton)
      .before(saveButton);
  } else {
    alert('Vertical Suit Saver seems to be out-of-date. Womp womp.');
  }
})();
