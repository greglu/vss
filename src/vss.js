$(function() {
  var CSS_URL = 'http://localhost:8000/vss.css';
  var IMAGE_BUTTON_PATH = 'http://localhost:8000/';

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
        close_popup_box();
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

      $('.paulund_modal_close').click(close_popup_box);
    }

    function close_popup_box() {
      $('.paulund_modal_box').fadeOut().remove();
      $('.paulund_block_page').fadeOut().remove();
    }

    add_block_page();
    add_popup_box();
    $('.paulund_modal_box').fadeIn();

    $('body').one('keyup', function(e) {
      if (e.which == 27) {
        close_popup_box();
      }
    });

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

  // ----- Social Sharing ----- //

  function generateShareLink() {
      var state = serializeCurrentState();
      var shareLink = document.createElement('a');
      shareLink.href = document.URL;
      shareLink.hash = encodeURIComponent(state);
      return shareLink.href;
  }

  function getShortenedUrl(longUrl, cb) {
    $.ajax({
      type: 'POST',
      dataType: 'json',
      contentType: 'application/json; charset=utf-8',
      url: 'https://www.googleapis.com/urlshortener/v1/url',
      data: JSON.stringify({ longUrl: longUrl }),
      success: function(response)
      {
        cb(response.id);
      },
    });
  }

  function navigateToLink(url) {
    // Using this method since window.open will trigger pop-up blockers
    var a = document.createElement('a');
    if (!a.click) {
      // for IE
      window.location = url;
      return;
    }
    a.setAttribute('href', url);
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
  }

  function shareFacebook() {
    getShortenedUrl(generateShareLink(), function(shortenedUrl) {
      navigateToLink('https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(shortenedUrl));
    });
    return false;
  }

  function shareTwitter() {
    getShortenedUrl(generateShareLink(), function(shortenedUrl) {
      navigateToLink('http://twitter.com/home?status=' + encodeURIComponent('Check out my Vertical Suit design! ' + shortenedUrl));
    });
    return false;
  }

  function shareGooglePlus() {
    getShortenedUrl(generateShareLink(), function(shortenedUrl) {
      navigateToLink('https://plus.google.com/share?url=' + encodeURIComponent(shortenedUrl));
    });
    return false;
  }

  function sharePinterest() {
    getShortenedUrl(generateShareLink(), function(shortenedUrl) {
      var description = encodeURIComponent('Check out my Vertical Suit design!');
      navigateToLink('http://www.pinterest.com/pin/create/button/?description=' + description +
        '&url=' + encodeURIComponent(shortenedUrl) +
        '&media=' + encodeURIComponent('https://www.verticalsuits.com/order/img/vertical-designer.png'));
    });
    return false;
  }

  function shareEmail() {
    getShortenedUrl(generateShareLink(), function(shortenedUrl) {
      var subject = encodeURIComponent('Check out my Vertical Suit design!');
      navigateToLink('mailto:?subject=' + subject + '&body=' + encodeURIComponent(shortenedUrl));
    });
    return false;
  }

  // ----- Main controls ----- //

  function wrapElement(el, name) {
    return $('<div class="vss-section ' + name + '">').append(el);
  }

  function initializeDesignList(domIdName) {
    var designList = $('<select>Load Saved Design</select>')
      .attr('id', domIdName);

    designList.append(
      $('<option>', { value: '', selected: 'selected' }).text('')
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

    return wrapElement(designList, 'load').prepend('<span>Load Saved Design</span>');
  }

  function addDesignListEntry(designList, designName) {
    if (designName) {
      var selectElement = designList.find('select');
      if (selectElement.length === 0) {
        selectElement = designList;
      }
      selectElement.append($('<option>', { value: designName }).text(designName));
    }
  }

  function initializeDelete(designList) {
    var deleteButton = $('<a href="#">Delete</a>');
    deleteButton.click(function(ev) {
      var selectedDesign = designList.find(':selected').val();
      if (selectedDesign && confirm('Are you sure you want to delete: ' + selectedDesign)) {
        console.log('Deleting design: ' + selectedDesign);
        deleteDesign(selectedDesign);
        designList.find('option[value=' + selectedDesign + ']').remove();
      }
      return false;
    });
    return wrapElement(deleteButton, 'delete');
  }

  function initializeSave(designList) {
    var saveButton = $('<a href="#">Save this Design</a>');
    saveButton.click(function(ev) {
      var selectedDesign = $(designList).find(':selected').val();
      var defaultName = selectedDesign || (new Date()).toLocaleString();
      var designName = prompt('Name this design!', defaultName);
      if (saveDesign(designName)) {
        addDesignListEntry(designList, designName);
      }
      return false;
    });

    var toolTip = $('<img class="vss_tip_toggle" width="14" alt="VSS tool tip" src="img/Tango-icon-tip.png">');
    toolTip.click(function(ev) {
      var output = '<div>You can save multiple designs. You will need to use the same browser to access them later, or else you need to use the share functions to get a link for later access. Saving function only saves the information contained in suit options and measurements, your contact and billing info will not be saved nor shared so you can safely share your designs on social media sites.</div>' +
          '<div><strong>NOTE:</strong> Vertical Suits cannot access any of your saved designs unless you share them with us or submit your order.</div>';

      modalBox({ title: 'Save this Design', description: output });

      return false;
    });

    var saveElement = wrapElement(saveButton, 'save');
    saveElement.append(toolTip);

    return saveElement;
  }

  function initializeShare() {
    var shareButton = $('<a href="#">Share</a>');
    shareButton.click(function(ev) {
      ev.preventDefault();

      getShortenedUrl(generateShareLink(), function(shortenedUrl) {
        var output = '<div>Copy the link below, and share it with your friends</div>' +
          '<div><strong>NOTE:</strong> only suit options, and measurements are shared</div>' +
          '<div><input type="text" size="75" value="' + shortenedUrl + '"></div>';

        modalBox({ description: output });
      });

      return false;
    });

    var shareElement = wrapElement(shareButton, 'share');

    var facebookButton = $('<img src="' + IMAGE_BUTTON_PATH + '/facebook.png" alt="Share on Facebook" />');
    facebookButton.click(shareFacebook);
    shareElement.append(facebookButton);

    var twitterButton = $('<img src="' + IMAGE_BUTTON_PATH + '/twitter.png" alt="Share on Twitter" />');
    twitterButton.click(shareTwitter);
    shareElement.append(twitterButton);

    var googlePlusButton = $('<img src="' + IMAGE_BUTTON_PATH + '/gplus.png" alt="Share on Google+" />');
    googlePlusButton.click(shareGooglePlus);
    shareElement.append(googlePlusButton);

    var pinterestButton = $('<img src="' + IMAGE_BUTTON_PATH + '/pinterest.png" alt="Share on Pinterest" />');
    pinterestButton.click(sharePinterest);
    shareElement.append(pinterestButton);

    var emailButton = $('<img src="' + IMAGE_BUTTON_PATH + '/email.png" alt="Share by E-Mail" />');
    emailButton.click(shareEmail);
    shareElement.append(emailButton);

    return shareElement;
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
    var deleteButton = initializeDelete(designList);
    var saveButton = initializeSave(designList);
    var shareButton = initializeShare();

    // This is where the ordering of the sections happens
    var vss = $('<div id="vss" class="form_submit clearfix">').append('<div class="wrapper">');
    vss.find('.wrapper')
      .append(saveButton)
      .append(designList)
      .append(deleteButton)
      .append(shareButton);

    $('.suit_selector').after(vss);

    init();
  } else {
    alert('Vertical Suit Saver seems to be out-of-date. Womp womp.');
  }
});
