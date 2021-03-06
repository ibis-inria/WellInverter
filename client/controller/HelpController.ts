///<reference path="WellInverterController.ts" />
///<reference path="TabController.ts" />


/**
 * Class for handling help
 */
class HelpController {

    /**
     * WellInverterController associated with me
     */
    wic: WellInverterController;

    /**
     * Constructor
     */
    constructor(wic: WellInverterController) {
        this.wic = wic;
    }

    /**
     * Display help about active tab in a new help tab
     */
    showView():void {
        var tc = this.wic.tabController;
        if ( tc.existsTab(TabController.HELP_TAB) )
            tc.closeTab(TabController.HELP_TAB);

        var selTab = tc.selectedTab();
        tc.showTab(TabController.HELP_TAB);

        $("#help").livequery(function() {   // livequery() waits for view complete loading
            $('.section').each(function () {
                $(this).show();
            });

            if (selTab != null) {
                var url = tc.getDisplayedTabUrl(selTab);
                var urlDivId = url.replace(".html", "-section");
                $('.section').each(function () {
                    $(this).hide();
                });
                $('#' + urlDivId).show();
            }
        });
    }
}
