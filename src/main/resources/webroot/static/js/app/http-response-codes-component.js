(function() {

    var options = {
        pieHole: 0.4,
        "is3D": false,

        "width": 400,
        "height": 200,

        "chartArea": {
            left: 10, top: 10,
            width: "80%", height: "90%"
        },

        "legend": {
            position: "right",
            textStyle : {
                fontSize : 13
            }
        },

        backgroundColor : {
            fill : "transparent"
        }

        /* Would be nice to apply proper colors to the different status codes (Green for 2xx and so on..)
        slices: {
            0: { color: 'yellow' },
            1: { color: 'transparent' }
        }
        */
    };

    var component = {
        name                : "HTTP Response Codes",
        shortDescription    : "HTTP response status codes",
        dom_id              : "http_status_container"
    };

    var bindings = {
        httpResponseCodes : ko.observable({})
    };

    // Discount metric GET requests from the statistics, otherwise it will completely
    // dominate at a rate of 1 request / second

    // Use local storage to persist count across page refreshes

    var getNumberOfMetricRequestsToIgnore = function() {
        return localStorage["dropwizard-dashboard.numberOfMetricRequestsToIgnore"];
    };

    var setNumberOfMetricRequestsToIgnore = function(num) {
        localStorage["dropwizard-dashboard.numberOfMetricRequestsToIgnore"] = num;
    };

    var ignoreMetricRequest = function() {
        localStorage["dropwizard-dashboard.numberOfMetricRequestsToIgnore"]++;
    };

    var resetIgnorableMetricRequests = function() {
        setNumberOfMetricRequestsToIgnore(0);
    };

    if (!getNumberOfMetricRequestsToIgnore()) {
        resetIgnorableMetricRequests();
    }

    var pieChart;

    Dropwizard.registerComponent({
        bindings : bindings,
        pageComponent : component,

        onMetrics : function(update) {
            var servletInfo = update.meters;

			/**
            var successCodes = servletInfo["io.dropwizard.jetty.MutableServletContextHandler.2xx-responses"].count - getNumberOfMetricRequestsToIgnore();

            if (successCodes < 0) {
                // This can happen if our ignored requests is innaccurate.
                // Recover as best as we can.
                successCodes = 0;
                setNumberOfMetricRequestsToIgnore(servletInfo["io.dropwizard.jetty.MutableServletContextHandler.2xx-responses"].count);
            }**/

            var statusCodeCounts = {
                1: servletInfo["io.dropwizard.jetty.MutableServletContextHandler.1xx-responses"].count,
                2: servletInfo["io.dropwizard.jetty.MutableServletContextHandler.2xx-responses"].count, //successCodes,
                3: servletInfo["io.dropwizard.jetty.MutableServletContextHandler.3xx-responses"].count,
                4: servletInfo["io.dropwizard.jetty.MutableServletContextHandler.4xx-responses"].count,
                5: servletInfo["io.dropwizard.jetty.MutableServletContextHandler.5xx-responses"].count
            };

            var total = statusCodeCounts[1] + statusCodeCounts[2] + statusCodeCounts[3] +
                        statusCodeCounts[4] + statusCodeCounts[5];

            bindings.httpResponseCodes({
                statusCodeCounts : statusCodeCounts,
                total : total
            });

            ignoreMetricRequest();
        },

        onDropwizardConnectionRestored: function() {
            // The server probably restarted, so reset this count.
            resetIgnorableMetricRequests();
        },

        /**
         * Download and install the heap page component template and install it to
         * activate Knockout.js data binding.
         */
        beforeSocketConnect : function() {
            Dropwizard.installRemoteTemplate("http-response-codes-template", "/static/templates/http-response-codes.html");
            Dropwizard.appendTemplateTo("http-response-codes-template", document.getElementById(component.dom_id));

            var container = document.getElementById("http_response_codes_container");
            pieChart = new google.visualization.PieChart(container);

            bindings.httpResponseCodes.subscribe(function(responseCodes) {
                var data = [
                    ["Label", "Value"]
                ];

                var statusCodeCounts = responseCodes.statusCodeCounts;

                data.push(["1xx", statusCodeCounts[1]]);
                data.push(["2xx", statusCodeCounts[2]]);
                data.push(["3xx", statusCodeCounts[3]]);
                data.push(["4xx", statusCodeCounts[4]]);
                data.push(["5xx", statusCodeCounts[5]]);

                var plot = google.visualization.arrayToDataTable(data);
                pieChart.draw(plot, options);
            });
        }
    });

})();