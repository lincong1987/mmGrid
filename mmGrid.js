define(["avalon", "text!mmGrid.html"], function(avalon, html) {

    var useTransition = window.TransitionEvent || window.WebKitTransitionEvent

    var styleEl = document.getElementById("avalonStyle")

    var widget = avalon.ui.grid = function(element, data, vmodels) {
        var $element = avalon(element), options = data.gridOptions, tabs = [],
                tabpanels = [],
                model, el
        var fragment = document.createDocumentFragment()

        $element.addClass(" ui-accordion ui-widget ui-helper-reset")
        var bodyHeight = options.bodyHeight
        var rawDatas = options.rows
        var max = Math.min(rawDatas.length, options.maxRows)
        avalon.log("只显示" + max + "行")
        var model = avalon.define(data.gridId, function(vm) {
            vm.active = options.active;
            vm.rows = []
            vm.realHeight = rawDatas.length * options.rowHeight
            vm.viewportHeight = max * options.rowHeight
            vm.srollTop = 0
            vm.min = 0
            vm.sss = function(e) {
                var top = this.scrollTop
                var min = Math.floor(top / options.rowHeight)
                
                var datas = options.rows.slice(min, min + max + 5)
                if (datas.length >= max) {
                    model.min = min
                    for (var i = 0, n = datas.length; i < n; i++) {
                        vm.rows.set(i, datas[i])
                    }
                }
                vm.srollTop = top
            }
        })
        //比要显示的行数多五个
        var datas = options.rows.slice(0, max + 5)
        model.rows = datas
        avalon.nextTick(function() {
            element.innerHTML = html
            avalon.scan(element, [model].concat(vmodels))
        })
    }
    widget.defaults = {
        maxRows: 20,
        rowHeight: 25,
        defaultColumnWidth: 80
    }
    return avalon
})