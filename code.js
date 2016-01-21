var LiveApi = window['binary-live-api'].LiveApi;
var apiUrl = 'wss://ws.binaryws.com/websockets/v3';

var editor = CodeMirror.fromTextArea(document.getElementById('editor'), {
    theme: 'icecoder',
    lineNumbers: true
});

var api,
    manuallySentReq
    $console = $('#playground-console');

function escapeHtml(unsafe) {
    return unsafe.toString()
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

function initConnection() {
    api = new LiveApi({ apiUrl: apiUrl });

    api.events.on('*', incomingMessageHandler);
}

function incomingMessageHandler(json) {
    var authorizationError = !!(json.error && json.error.code == "AuthorizationRequired");
        prettyJson = getFormattedJsonStr(json);
   console.log(json); // intended to help developers, not for debugging, do not remove
   $('.progress').remove();
   appendToConsoleAndScrollIntoView(prettyJson);
   $('#unauthorized-error').toggle(authorizationError);
};

function issueRequestAndDisplayResult($node, requestUrl) {
    $node.html('<div class="progress"></div>');
    $.get(requestUrl, function(requestJson) {
        api.sendRaw(requestJson);
    });
}

function loadAndEditJson($node, jsonUrl) {
    $.get(jsonUrl, function(exampleJson) {
        $node.val(JSON.stringify(exampleJson, null, 2));
    });
}

function scrollConsoleToBottom() {
    $console.stop(false, true);
    $console.animate({ scrollTop: $console[0].scrollHeight }, 500);
}

function consoleShouldScroll() {
    return Math.abs($console[0].scrollHeight - $console.scrollTop() - $console.outerHeight()) > 10;
}

function appendToConsoleAndScrollIntoView(html) {
    $console.stop(false, true);

    setTimeout(function() {
        $console.append(html)[0];

        if (consoleShouldScroll()) {
            scrollConsoleToBottom();
            setTimeout(function() {
                if (consoleShouldScroll()) {
                    $console.animate({ scrollTop: $console[0].scrollHeight }, 500);
                }
            }, 1500);
        }
    }, 0);
}

function updatePlaygroundWithRequestAndResponse() {
    try {
        var json = JSON.parse($('#playground-request').val());
    } catch(err) {
        alert('Invalid JSON!');
        return;
    }

    appendToConsoleAndScrollIntoView('<pre class="req">' + jsonToPretty(json) + '</pre>' + '<div class="progress"></div>');
    api.sendRaw(json);
}

$('#api-call-selector, #api-version-selector').on('change', function() {
    var verStr = $('#api-version-selector').val(),
        apiStr = $('#api-call-selector').val(),
        urlPath = '/config/' + verStr + '/' + apiStr + '/',
        requestSchemaUrl = urlPath + 'send.json',
        responseSchemaUrl = urlPath + 'receive.json',
        exampleJsonUrl = urlPath + 'example.json';
    loadAndDisplaySchema($('#playground-req-schema'), requestSchemaUrl);
    loadAndDisplaySchema($('#playground-res-schema'), responseSchemaUrl);
    loadAndEditJson($('#playground-request'), exampleJsonUrl);
    window.location.hash = apiStr;
});

$('#api-version-selector, #api-language-selector').on('change', function(е) {
    var verStr = $('#api-version-selector').val(),
        langStr = $('#api-language-selector').val();
    apiUrl = 'wss://ws.binaryws.com/websockets/' + verStr + '?l=' + langStr;
    initConnection();
});

$('#playground-send-btn').on('click', function() {
    updatePlaygroundWithRequestAndResponse();
});

$('#open-in-playground').on('click', function() {
    window.location.href = '/playground#' + getCurrentApi();
});

$('#playground-reset-btn').on('click', function() {
    $('#playground-console').html('');
    initConnection();
});

$('#api-token').on('change', function() {
    sessionStorage.setItem('token', $('#api-token').val());
    console.log($('#api-token').val())
});

function showDemoForLanguage(lang) {
    $('[data-language]').hide();
    $('[data-language="' + lang + '"]').show();
}

$('#demo-language').on('change', function() {
    showDemoForLanguage($(this).val());
});

function updateApiDisplayed() {
    if ($('#api-call-selector').length == 0) return;

    var apiToDisplay = getCurrentApi();
    if (apiToDisplay) {
        $('#api-call-selector').val(apiToDisplay).change();
    }
}

$('#send-auth-manually-btn').on('click', function() {
    var token = sessionStorage.getItem('token');
        authReqStr = JSON.stringify({
            authorize: token || ''
        }, null, 2);

    $('#playground-request').val(authReqStr);
    if (token) {
        $('#playground-send-btn').click();
    } else {
        $('#playground-request').focus();
    }
});

$('#scroll-to-bottom-btn').on('click', scrollConsoleToBottom);

$console.on('scroll', function() {
    var shouldShow = consoleShouldScroll() && !$console.is(':animated');
    $('#scroll-to-bottom-btn').toggle(shouldShow);
});

$(window).on('hashchange', updateApiDisplayed);
initConnection();
updateApiDisplayed();
$('#api-token').val(sessionStorage.getItem('token'));

$('#run').on('click', function () {
    execute();
});

// "Whenever the last tick of the Random 100 Index is 9, then buy a $10-payout 5-tick digit bet that predicts that the last digit will not be 9".
function execute()  {
    var api = new LiveApi();

    api.authorize('8PgmMxKGP0ARsRs');
    api.subscribeToTicks('R_100');

    api.events.on('tick', function(response) {
        if (response.tick.quote.slice(-1) == '9') {
            api.getPriceProposalForContract({
                basis: 'payout',
                amount: '10',
                currency: 'USD',
                symbol: 'R_100',
                contract_type: 'DIGITDIFF',
                barrier: 9,
                duration: 5,
                duration_unit: 't',
            });
        }
    });

    api.events.on('proposal', function(response) {
        api.buyContract(response.proposal.id, 10);
    });

    api.events.on('buy', function(response) {
        console.log('contract bought', response);
    });
}
