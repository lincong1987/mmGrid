define(["avalon", "text!mmGrid.html"], function(avalon, html) {

    var useTransition = window.TransitionEvent || window.WebKitTransitionEvent

    var styleEl = document.getElementById("avalonStyle")

    var widget = avalon.ui.grid = function(element, data, vmodels) {
        var $element = avalon(element), options = data.gridOptions, tabs = [],
                model, el
        var fragment = document.createDocumentFragment()

        $element.addClass(" ui-grid ui-widget ui-helper-reset")
        var rawDatas = options.rows
        var max = Math.min(rawDatas.length, options.maxRows)
        var total = rawDatas.length
        avalon.log("只显示" + max + "行")
        function makeColumns(array) {
            var ret = []
            for (var i = 0, el; el = array[i++]; ) {
                if (typeof el == "string") {
                    el = {
                        field: el
                    }
                }
                el.text = el.text || el.field
                el.title = options.getColumnTitle(el)
                el.width = el.width || options.columnWidth
                el.className = el.className || ""
                el.sortable = !!el.sortable
                el.toggle = true
                ret.push(el)
            }
            return ret
        }
        var top = 0
        var model = avalon.define(data.gridId, function(vm) {
            vm.active = options.active;
            vm.rows = []
            vm.columns = makeColumns(options.columns)
            vm.viewportHeight = max * options.rowHeight
            vm.realHeight = total * options.rowHeight
            vm.srollTop = 0
            vm.min = 0
            vm.total = total
            vm.firstField = ""
            vm.getCellWidth = function(name){
                for(var i =0, el; el = vm.columns[i++];){
                    if(el.field === name){
                        return el.width
                    }
                }
            }
            vm.sss = function(e) {
                top = this.scrollTop
                var min = Math.floor(top / options.rowHeight)
                if (min + max <= total) {
                    model.min = min
                    var datas = options.rows.slice(min, min + max + 5)
                    for (var i = 0, n = datas.length; i < n; i++) {
                        vm.rows.set(i, datas[i])
                    }
                    vm.srollTop = top
                }
            }
        })
        model.firstField = model.columns[0].field
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
        headerHeight: 25,
        columnWidth: 160,
        getColumnTitle: function() {
            return ""
        }
    }
    return avalon
})