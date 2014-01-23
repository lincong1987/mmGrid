define(["avalon", "text!mmGrid.html"], function(avalon, html) {

    var useTransition = window.TransitionEvent || window.WebKitTransitionEvent

    var styleEl = document.getElementById("avalonStyle")

    function miniFx(elem, prop, from, to, opts) {
        var startTime = new Date
        var change = to - from
        if (typeof opts === "number") {
            duration = opts
            opts = {
                duration: duration
            }
        } else {
            opts = opts || {}
        }
        var complete = typeof opts.complete == "function" ? opts.complete : function() {
        }
        var duration = opts.duration || 700
        var easing = typeof opts.easing == "function" ? opts.easing : function(per) {
            return (-Math.cos(per * Math.PI) / 2) + 0.5
        }
        var id = setInterval(function() {
            var per = (new Date - startTime) / duration
            var end = per >= 1
            var cur = (end ? to : from + easing(per) * change)
            if (/^scroll/.test(prop)) {
                elem[prop] = cur + "px"
            } else {
                avalon.css(elem, prop, cur)
            }
            if (end) {
                clearInterval(id)
                complete.call(elem)
            }
        }, 13)
    }

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
                el.sortTrend = "asc"
                el.toggle = true
                el.lockDisplay = typeof el.lockDisplay === "boolean" ? el.lockDisplay : false
                el.lockWidth = typeof el.lockWidth === "boolean" ? el.lockWidth : false

                ret.push(el)
            }
            return ret
        }
        var top = 0, slideDown = false

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
            vm.headerHeight = options.headerHeight
            vm.resizeToggle = false
            vm.resizeLeft = 1
            vm.getCellWidth = function(name) {
                for (var i = 0, el; el = vm.columns[i++]; ) {
                    if (el.field === name) {
                        return el.width
                    }
                }
            }
            vm.getCellToggle = function(name) {
                for (var i = 0, el; el = vm.columns[i++]; ) {
                    if (el.field === name) {
                        return el.toggle
                    }
                }
            }
            vm.backboardToggle = false
            vm.editCell = function(e) {//即时编辑某个单元格，事件代理
                var target = e.target
                if (target.className.indexOf("editable") !== -1) {
                    target.style.display = "none"
                    var input = target.nextSibling
                    input.style.display = "block"
                    input.focus()
                    if (window.netscape) {
                        var n = input.value.length
                        input.selectionStart = n
                        input.selectionEnd = n
                    } else {
                        input.value = input.value// 让光标位于文字之的后
                    }
                }
            }
            vm.uneditCell = function(index, name) {//还原为文本状态
                var obj = rawDatas[index]
                if (obj) {
                    obj[name] = this.value
                }
                this.style.display = "none"
                this.previousSibling.style.display = "block"
            }
            vm.theadChick = function(e) {//对某一列进行排序，使用事件代理
                var target = e.target
                if (target.className.indexOf("ui-helper-sorter") !== -1) {
                    e.preventDefault()
                    var proxy = target.parentNode["data-vm"]
                    var field = proxy.field
                    var trend = target.innerHTML.trim() === "▲"
                    vm.rows.sort(function(a, b) {
                        var ret = a[field] - b[field]
                        return ret * (trend ? 1 : -1)
                    })
                    var models = vm.rows.$model, j = vm.min
                    for (var i = 0, el; el = models[i]; i++) {//同步原始数组
                        rawDatas[j + i] = el
                    }
                    target.innerHTML = trend ? "▼" : "▲"
                }
            }
            vm.theadDown = function(e) {//实现表头拖动列宽，使用事件代理
                var target = e.target
                if (target.className.indexOf("ui-helper-resizer") !== -1) {
                    e.preventDefault()
                    vm.resizeToggle = true
                    var gridLeft = avalon(element).offset().left
                    var resizeStart = e.pageX
                    var resizeTarget = target
                    vm.resizeLeft = e.pageX - gridLeft
                    var moveFn = avalon.bind(window, "mousemove", function(e) {
                        e.preventDefault()
                        if (resizeTarget) {
                            vm.resizeLeft = e.pageX - gridLeft
                        }
                    })
                    var upFn = avalon.bind(window, "mouseup", function(e) {
                        e.preventDefault()
                        if (resizeTarget) {
                            var proxy = resizeTarget.parentNode["data-vm"]
                            proxy.width = proxy.width + e.pageX - resizeStart
                            resizeTarget = vm.resizeToggle = false
                            avalon.unbind(window, "mousemove", moveFn)
                            avalon.unbind(window, "mouseup", upFn)
                        }
                    })
                }else{
                    
                }
            }
            vm.showSlider = function() {
                if (!slideDown && !model.backboardToggle) {
                    slideDown = true
                    var id = model.$id + "SlideDown"
                    var target = document.getElementById(id)
                    target.style.display = "block"
                    miniFx(target, "height", 0, 22, 400)
                }
            }
            vm.hideSlider = function() {
                if (slideDown) {
                    slideDown = false
                    var id = model.$id + "SlideDown"
                    var target = document.getElementById(id)
                    miniFx(target, "height", 22, 0, {
                        duration: 400,
                        complete: function() {
                            target.style.display = "none"
                        }
                    })
                }
            }
            vm.showTbody = function(e) {
                var target = e.target
                var id = model.$id + "Tbody"
                var tbody = document.getElementById(id)
                var height = tbody.parentNode.offsetHeight
                // tbody.parentNode.style.overflow = "hidden"
                miniFx(tbody, "top", height, 0, 800)
                miniFx(target, "bottom", 0, -22, {
                    duration: 500,
                    complete: function() {
                        slideDown = model.backboardToggle = false
                        target.style.display = "none"
                    }
                })
            }
            vm.hideTbody = function(e) {
                var target = e.target
                miniFx(target, "height", 22, 0, {
                    duration: 500,
                    complete: function() {
                        target.style.display = "none"
                        model.backboardToggle = true
                    }
                })
                var id = model.$id + "Tbody"
                var tbody = document.getElementById(id)
                var height = tbody.parentNode.offsetHeight
                miniFx(tbody, "top", 20, height, {
                    duration: 800,
                    complete: function() {
                        var id = model.$id + "SlideUp"
                        var elem = document.getElementById(id)
                        elem.style.bottom = "-22px"
                        elem.style.display = "block"

                        miniFx(elem, "bottom", -22, 0, 400)
                    }
                })
            }
            vm.scroll = function(e) {
                top = this.scrollTop
                var min = Math.floor(top / options.rowHeight)
                if (min + max <= total) {
                    model.min = min
                    var datas = avalon.mix(true, [], rawDatas.slice(min, min + max + 5))
                    for (var i = 0, n = datas.length; i < n; i++) {
                        vm.rows.set(i, datas[i])
                    }
                    vm.srollTop = top
                }
            }
        })
        //比要显示的行数多五个
        var datas = avalon.mix(true, [], rawDatas.slice(0, max + 5))
        model.rows = datas
        avalon.nextTick(function() {
            element.innerHTML = html.replace(/#VMID#/g, model.$id)
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

