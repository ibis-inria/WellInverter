///<reference path="../jquery.d.ts" />
///<reference path="WellInverterController.ts" />
///<reference path="../Handlebars.ts" />
/**
 * Microplate representation and various form elements allowing one to choose wells and parameters for plotting
 */
var PlotSelector = (function () {
    /**
     * Constructor
     * @param wic
     */
    function PlotSelector(wic) {
        // measure subtype
        this.measureSubType = -1;
        // size of well
        this.boxSize = 25;
        // offset of the 1st well from the top left corner
        this.matrixOffsetX = 10;
        this.matrixOffsetY = 35;
        /**
         * Number of plots in plots list
         */
        this.plotsCount = 1;
        /**
         * Number of wellSets in wellSets list
         */
        this.wellSetsCount = 1;
        this.wic = wic;
    }
    PlotSelector.prototype.init = function () {
        this.initPlotSelectorForm();
        var ps = this;
        $("#microplate").livequery(function () {
            ps.setMode(PlotSelector.HIDDEN_MODE);
            ps.setMicroplateClickHandler();
        });
        this.initSelection();
        this.initColorPalette();
    };
    PlotSelector.prototype.initPlotSelectorForm = function () {
        // prepare data for instantiating Handlebar template in plot-selector.html
        var data = { selects: [] };
        for (var s = 0; s <= 2; s++) {
            data.selects.push({ num: s + 1, notFirst: (s > 0), opts: [] });
            for (var i = 0; i < wic.wr.measureSubTypes.length; i++) {
                data.selects[s].opts.push({ name: wic.wr.measureSubTypes[i].name, value: i });
            }
        }
        var tplScript = $("#selector-form-template").html();
        var template = Handlebars.compile(tplScript);
        $("#plot-selector-form").html(template(data));
    };
    /**
     * Set display mode
     *
     * @param mode display mode: see constant at the top of the class
     */
    PlotSelector.prototype.setMode = function (mode) {
        if (mode != PlotSelector.PLOT_DISPLAY_MODE && (mode != PlotSelector.OUTLIER_DETECTION_MODE && mode != PlotSelector.DATA_FIT_MODE) && mode != PlotSelector.HIDDEN_MODE)
            throw new Error("Wrong mode in PlotSelector.setMode()");
        var selWells = this.selectedWells().slice(0); // copy
        if (this.mode == PlotSelector.PLOT_DISPLAY_MODE && (mode == PlotSelector.OUTLIER_DETECTION_MODE || mode == PlotSelector.DATA_FIT_MODE)) {
            this.initSelection(); // for PLOT_DISPLAY_MODE
            if (selWells.length == 1)
                this.selectedWell = selWells[0];
            this.mode = mode;
        }
        else if ((this.mode == PlotSelector.OUTLIER_DETECTION_MODE || this.mode == PlotSelector.DATA_FIT_MODE) && mode == PlotSelector.PLOT_DISPLAY_MODE) {
            this.selectedWell = null;
            this.mode = PlotSelector.PLOT_DISPLAY_MODE;
            this.initSelection(); // for PLOT_DISPLAY_MODE
            if (selWells.length == 1)
                this.setSelected(selWells[0].getLine(), selWells[0].getColumn(), true);
        }
        else if (this.mode != mode) {
            this.initSelection(); // once for previous mode
            this.mode = mode;
            this.initSelection(); // once for new mode
        }
        this.drawMicroplate();
        this.setVisibility('plot-selector', mode != PlotSelector.HIDDEN_MODE);
        this.setVisibility('plot-parameters', mode == PlotSelector.PLOT_DISPLAY_MODE);
    };
    /**
     * Set measure type
     *
     * @param measureSubType
     */
    PlotSelector.prototype.setMeasureType = function (measureSubType) {
        this.measureSubType = measureSubType;
        this.drawMicroplate();
    };
    /**
     * Show/hide plot selector
     * @param divId id of div containing plot selector
     * @param isVisible
     */
    PlotSelector.prototype.setVisibility = function (divId, isVisible) {
        var jqDiv = $('#' + divId);
        if (isVisible)
            jqDiv.show();
        else
            jqDiv.hide();
    };
    /**
     * Set up selection
     */
    PlotSelector.prototype.initSelection = function () {
        if (this.mode == PlotSelector.PLOT_DISPLAY_MODE) {
            this.selected = [];
            for (var l = 0; l < 8; l++)
                this.selected[l] = [false, false, false, false, false, false, false, false, false, false, false, false];
        }
        else if ((this.mode == PlotSelector.OUTLIER_DETECTION_MODE || this.mode == PlotSelector.DATA_FIT_MODE))
            this.selectedWell = null;
    };
    /**
     * Set up color palette
     */
    PlotSelector.prototype.initColorPalette = function () {
        var palette = "";
        for (var i = 0; i < wic.plotController.colors.length; i++) {
            palette += "<span class='color-wrapper'><span id='col-" + i + "' data-color-id='" + i + "' class='color-cell' style='background-color: " + wic.plotController.colors[i] + "'>&nbsp;</span></span>";
        }
        palette += "<span class='color-wrapper'><span id='col-auto' data-color-id='auto' class='color-auto'>Auto</span></span>";
        $('#color-palette').html(palette);
        wic.plotController.currentColor = 'auto';
        $('#col-auto').parent().css("border-color", "black");
        $('.color-cell').click(function () {
            $('#col-' + wic.plotController.currentColor).parent().css("border-color", "white");
            var colorId = $(this).data("color-id");
            wic.plotController.currentColor = colorId;
            $('#col-' + colorId).parent().css("border-color", "black");
        });
        $('.color-auto').click(function () {
            $('#col-' + wic.plotController.currentColor).parent().css("border-color", "white");
            var colorId = $(this).data("color-id");
            $('#col-' + colorId).parent().css("border-color", "black");
            wic.plotController.currentColor = colorId;
            wic.plotController.usedColors = [];
            wic.plotController.colorHash = [];
        });
    };
    /**
     * Return selected wells
     */
    PlotSelector.prototype.selectedWells = function () {
        var sels = [];
        if (this.mode == PlotSelector.PLOT_DISPLAY_MODE) {
            for (var l = 0; l < 8; l++) {
                for (var c = 0; c < 12; c++) {
                    if (this.selected[l][c])
                        sels.push(this.wic.wr.getWell(12 * l + c));
                }
            }
        }
        else if (this.selectedWell != null)
            sels.push(this.selectedWell);
        return sels;
    };
    /**
     * Return true iff well with line l and column c is selected
     */
    PlotSelector.prototype.isSelected = function (l, c) {
        if (this.mode == PlotSelector.PLOT_DISPLAY_MODE)
            return this.selected[l][c];
        else
            return this.selectedWell != null && this.selectedWell.getLine() == l && this.selectedWell.getColumn() == c;
    };
    /**
     * Select/deselect well with line l and column c
     */
    PlotSelector.prototype.setSelected = function (l, c, sel) {
        if (this.mode == PlotSelector.PLOT_DISPLAY_MODE)
            this.selected[l][c] = sel;
        else
            this.selectedWell = this.wic.wr.getWell(12 * l + c);
    };
    /**
     * Update well sets list in plot selector
     */
    PlotSelector.prototype.refreshWellSets = function () {
        var ps = this;
        for (var ws = 1; ws <= 5; ws++) {
            var wellSetDiv = $("#ws" + ws);
            wellSetDiv.html('<option value="">---</option>');
            this.wic.wr.wellSets.forEach(function (wso) {
                wellSetDiv.append('<option value="' + wso.name + '">' + wso.name + '</option>');
            });
            wellSetDiv.change(function () {
                ps.initSelection();
                var ws = ps.wic.wr.wellSetDictionary[$(this).val()];
                if (ws != null) {
                    ws.wells.forEach(function (w) {
                        wic.plotSelector.selected[w.getLine()][w.getColumn()] = true;
                    });
                }
                wic.plotSelector.drawMicroplate();
                wic.plotController.updatePlots();
            });
        }
    };
    /**
     * Return X coordinate of well column c (0 <= c <= 11)
     */
    PlotSelector.prototype.xCoord = function (c) {
        return this.matrixOffsetX + 25 + c * this.boxSize;
    };
    /**
     * Return Y coordinate of well column l (0 <= l <= 7)
     */
    PlotSelector.prototype.yCoord = function (l) {
        return this.matrixOffsetY + l * this.boxSize;
    };
    /**
     * Draw microplate
     */
    PlotSelector.prototype.drawMicroplate = function () {
        var canvas = document.getElementById('microplate');
        var context = canvas.getContext('2d');
        context.clearRect(0, 0, 300, 300);
        // grey microplate background
        context.beginPath();
        context.rect(this.xCoord(0) - 15, this.yCoord(0) - 15, this.boxSize * 11 + 30, this.boxSize * 7 + 30);
        context.fillStyle = '#aaa';
        context.fill();
        for (var l = 0; l < 8; l++) {
            context.font = "10pt Arial";
            context.fillStyle = "#000000";
            context.fillText(String.fromCharCode(65 + l), 0, this.yCoord(l) + 5);
        }
        for (var c = 0; c < 12; c++) {
            context.fillText((c + 1).toString(), this.xCoord(c) - 4, this.yCoord(0) - 25);
        }
        for (var l = 0; l < 8; l++) {
            for (var c = 0; c < 12; c++) {
                if (this.wic.wr.getWell(12 * l + c).hasMeasure(this.measureSubType)) {
                    context.beginPath();
                    context.arc(this.xCoord(c), this.yCoord(l), 10, 0, Math.PI * 2, false);
                    context.fillStyle = 'lightgray';
                    context.fill();
                    context.lineWidth = (this.isSelected(l, c) ? 4 : 1);
                    context.strokeStyle = '666';
                    context.stroke();
                }
            }
        }
        this.updateSelector();
    };
    /**
     * Handle click on the microplate
     */
    PlotSelector.prototype.setMicroplateClickHandler = function () {
        this.drawMicroplate();
        var jqCanvas = $("#microplate");
        var plotSelectionDiv = $('#plot-selection');
        plotSelectionDiv.show(); // because offset() does not work on hidden elements
        var canvasOffsetX = jqCanvas.offset().left;
        var canvasOffsetY = jqCanvas.offset().top;
        plotSelectionDiv.hide();
        var ps = this; // necessary because inside event: this = event
        jqCanvas.click(function (e) {
            var xNow = e.pageX - canvasOffsetX;
            var yNow = e.pageY - canvasOffsetY; // console.log('clic:',xNow, yNow, Math.abs(xNow - ps.xCoord(0)), Math.abs(yNow - ps.yCoord(0)));
            for (var l = 0; l < 8; l++) {
                for (var c = 0; c < 12; c++) {
                    if (Math.abs(xNow - ps.xCoord(c)) < 15 && Math.abs(yNow - ps.yCoord(l) - $('#tree').height() - 10) < 15 && ps.wic.wr.getWell(12 * l + c).hasMeasure(ps.measureSubType)) {
                        var val = ps.isSelected(l, c);
                        ps.setSelected(l, c, !val);
                        break;
                    }
                }
            }
            ps.drawMicroplate();
            if (ps.mode == PlotSelector.OUTLIER_DETECTION_MODE)
                ps.wic.outlierDetectionController.updatePlots();
            else if (ps.mode == PlotSelector.PLOT_DISPLAY_MODE)
                ps.wic.plotController.updatePlots();
            else {
                console.log("Invalid mode: " + ps.mode);
            }
        });
    };
    PlotSelector.prototype.addPlotClickHandler = function () {
        if (this.plotsCount == 1) {
            $("#plot-chooser-2").show();
            this.initPlotParameters(2);
        }
        else {
            $("#plot-chooser-3").show();
            this.initPlotParameters(3);
        }
        $("#minus-1").show();
        if (this.plotsCount < 2)
            $("#plus").show();
        else
            $("#plus").hide();
        this.plotsCount++;
    };
    PlotSelector.prototype.removePlotClickHandler = function (plotNumber) {
        if (plotNumber == 3) {
            $("#plot-chooser-3").hide();
        }
        else {
            if (plotNumber == 1)
                this.copyUpPlotParameters(2);
            if (this.plotsCount == 3) {
                this.copyUpPlotParameters(3);
                $("#plot-chooser-3").hide();
            }
            else
                $("#plot-chooser-2").hide();
        }
        if (this.plotsCount == 2)
            $("#minus-1").hide();
        $("#plus").show();
        this.plotsCount--;
    };
    /**
     * Return measure type
     * @param p in [1 ; 3]
     */
    PlotSelector.prototype.getPlotMeasureType = function (p) {
        if (p <= this.plotsCount && $("#measure-" + p).val() != "")
            return $("#pmeasure-" + p).val();
        else
            return null;
    };
    /**
     * Return plot type
     * @param p in [1 ; 3]
     */
    PlotSelector.prototype.getPlotType = function (p) {
        if (p <= this.plotsCount && $("#plot-type-" + p).val() != "")
            return $("#plot-type-" + p).val();
        else
            return null;
    };
    PlotSelector.prototype.initPlotParameters = function (plotNumber) {
        $("#measure-" + plotNumber).val("");
        $("#plot-type-" + plotNumber).val("");
        $("show-mean-" + plotNumber).prop('checked', false);
        $("#show-std-error-" + plotNumber).prop('checked', false);
    };
    PlotSelector.prototype.copyUpPlotParameters = function (plotNumber) {
        $("#measure-" + (plotNumber - 1)).val($("#measure-" + plotNumber).val());
        this.measureChanged(plotNumber - 1);
        $("#plot-type-" + (plotNumber - 1)).val($("#plot-type-" + plotNumber).val());
        $("#show-mean-" + (plotNumber - 1)).prop('checked', $("#show-mean-" + plotNumber).is(':checked'));
        $("#show-std-error-" + (plotNumber - 1)).prop('checked', $("#show-std-error-" + plotNumber).is(':checked'));
    };
    PlotSelector.prototype.updateSelector = function () {
        for (var i = 1; i <= 3; i++) {
            if (this.selectedWells().length <= 1) {
                $('#show-mean-' + i).attr('checked', false);
                $('#show-mean-' + i).attr('disabled', 'disabled');
                $('#show-std-error-' + i).attr('checked', false);
                $('#show-std-error-' + i).attr('disabled', 'disabled');
            }
            else {
                $('#show-mean-' + i).removeAttr('disabled');
                $('#show-std-error-' + i).removeAttr('disabled');
            }
        }
    };
    PlotSelector.prototype.measureChanged = function (plotNumber) {
        // display all options
        $("#plot-type-" + plotNumber + " option").each(function () {
            $(this).show();
        });
        // hide options in function of selected measure
        var measureSel = $("#measure-" + plotNumber).val();
        if (measureSel != "") {
            var mst = wic.wr.measureSubTypes[measureSel];
            if (mst.type == Measure.ABS_TYPE) {
                $("#promoterActivity-" + plotNumber).hide();
                $("#reporterConcentration-" + plotNumber).hide();
            }
            else {
                $("#growthRate-" + plotNumber).hide();
            }
        }
    };
    PlotSelector.prototype.wellSetChanged = function (ws) {
        var opt = $("ws" + ws + " option:selected").text();
        console.log(opt); // to DO
    };
    PlotSelector.prototype.removeWellSetClickHandler = function (wsNumber) {
        for (var ws = wsNumber; ws < 5; ws++)
            $("#ws" + ws).val($("#ws" + (ws + 1)).val());
        if (this.wellSetsCount > 1)
            $("#div-ws" + this.wellSetsCount).hide();
        this.wellSetsCount--;
        $("#plus-ws").show();
        if (this.wellSetsCount == 1)
            $("#minus-ws1").hide();
        else
            $("#minus-ws1").show();
    };
    PlotSelector.prototype.addWellSetClickHandler = function () {
        if (this.wellSetsCount < 5) {
            $("#div-ws" + (this.wellSetsCount + 1)).show();
            $("#div-ws" + (this.wellSetsCount + 1)).val("");
            this.wellSetsCount++;
        }
        if (this.wellSetsCount < 5)
            $("#plus-ws").show();
        else
            $("#plus-ws").hide();
        if (this.wellSetsCount == 1)
            $("#minus-ws1").hide();
        else
            $("#minus-ws1").show();
    };
    // display mode of the selector
    PlotSelector.OUTLIER_DETECTION_MODE = 1; // only one well can be selected
    PlotSelector.DATA_FIT_MODE = 2; // same
    PlotSelector.PLOT_DISPLAY_MODE = 3; // several wells can be selected
    PlotSelector.HIDDEN_MODE = 4; // plot selector does not show for certain tabs
    return PlotSelector;
})();
//# sourceMappingURL=PlotSelector.js.map