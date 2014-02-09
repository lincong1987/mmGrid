define(["avalon", "text!mmGrid.html"], function(avalon, html) {

    var useTransition = window.TransitionEvent || window.WebKitTransitionEvent

    var styleEl = document.getElementById("avalonStyle")


    function enter(dropper, event) {
        var right = dropper.left + dropper.width
        var bottom = dropper.top + dropper.height
        if (event.pageX > dropper.left && event.pageX < right && event.pageY > dropper.top && event.pageY < bottom) {
            return true
        }
    }
//=========================与调整列的位置相关的函数=====================
    function getPrev(array, el) {
        var index = array.indexOf(el), i = 1
        while (el) {
            el = array[ index - i ]
            i++
            if (el && el.style.display != "none") {
                return el
            }
        }
        return null
    }
    function getNext(array, el) {
        var index = array.indexOf(el), i = 1
        while (el) {
            el = array[ index + i ]
            i++
            if (el && el.style.display != "none") {
                return el
            }
        }
        return null
    }
    function getPrevBox(el) {
        var offset = avalon(el).offset()
        return {
            left: offset.left,
            top: offset.top,
            width: el.offsetWidth / 2,
            height: el.offsetHeight
        }
    }
    function getNextBox(el) {
        var offset = avalon(el).offset()
        var nextBox = {
            left: offset.left,
            top: offset.top,
            width: el.offsetWidth / 2,
            height: el.offsetHeight
        }
        nextBox.left += nextBox.width
        return nextBox
    }

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
        var $element = avalon(element), options = data.gridOptions,
                model, el


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
        var top = 0, left = 0, slideDown = false
        //处理勾选栏
        var checkCol = options.checkCol
        var defaultCheckCol = widget.defaults.checkCol
        switch (avalon.type(checkCol)) {
            case "number":
                checkCol = avalon.mix(true, defaultCheckCol, {
                    type: checkCol
                })
                break;
            case "object":
                checkCol = avalon.mix(true, defaultCheckCol, checkCol)
                break;
            default:
                checkCol = avalon.mix(true, {}, defaultCheckCol)
                break;
        }
        if (checkCol.field) {
            var replacement = options.checkColHTML
            replacement = replacement.replace("NAME", (checkCol.name || "avalon" + (new Date - 0)))
            if (checkCol.type == 2) {
                replacement = replacement.replace("FIELD", checkCol.field)
            } else {
                replacement = replacement.replace("row.FIELD", "min+$index === checkedIndex")
            }

        } else {
            replacement = ""
        }
        html = html.replace("<!--checkColHTML-->", replacement)
        //处理索引栏
        var indexCol = options.indexCol
        var defaultIndexCol = widget.defaults.indexCol
        switch (avalon.type(indexCol)) {
            case "number":
                indexCol = avalon.mix(true, defaultIndexCol, {
                    type: indexCol
                })
                break;
            case "object":
                indexCol = avalon.mix(true, defaultIndexCol, indexCol)
                break;
            default:
                indexCol = avalon.mix(true, {}, defaultIndexCol)
                break;
        }
        replacement = indexCol.type ? options.indexColHTML : ""
        html = html.replace("<!--indexColHTML-->", replacement)

        var model = avalon.define(data.gridId, function(vm) {
            vm.active = options.active;
            vm.rows = []
            vm.columnsOrder = options.columnsOrder
            vm.columns = makeColumns(options.columns)
            vm.viewportHeight = max * options.rowHeight
            vm.realHeight = total * options.rowHeight
            vm.realWidth = options.columns.length * options.columnWidth
            vm.srollTop = 0
            vm.scrollLeft = 0
            vm.getColumnsOrder = function() {
                return vm.columnsOrder
            }
            vm.checkedIndex = NaN
            vm.checkAll = function() {
                var field = checkCol.field, checked = this.checked
                rawDatas.forEach(function(el) {
                    el[field] = checked
                })
                model.rows.forEach(function(el) {
                    el[field] = checked
                })
            }
            vm.checkOne = function(index) {
                if (model.checkCol.type == 2) {
                    rawDatas[index][ checkCol.field ] = this.checked
                } else {
                    model.checkedIndex = index
                }
            }
            vm.min = 0
            vm.total = total
            vm.$skipArray = ["columnsOrder", "indexCol"]
            vm.headerHeight = options.headerHeight
            vm.resizeToggle = false
            vm.resizeLeft = 1
            vm.checkCol = checkCol
            vm.indexCol = indexCol
            vm.rowHeight = options.rowHeight
            vm.getRealWidth = function(elem) {
                var thead = elem && elem.nodeType == 1 ? elem : this, ret = 0
                for (var i = 0, el; el = thead.childNodes[i++]; ) {
                    if (el.nodeType === 1) {
                        ret += el.offsetWidth
                    }
                }
                model.realWidth = ret + 20//20留给滚动条
            }
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
                var curTH = e.target;
                if (curTH.className.indexOf("ui-helper-resizer") !== -1) {
                    e.preventDefault()
                    vm.resizeToggle = true
                    var gridLeft = avalon(element).offset().left
                    var resizeStart = e.pageX
                    var resizeTarget = curTH
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
                            var thead = document.getElementById(model.$id + "Thead")
                            model.realWidth = model.getRealWidth(thead)
                            avalon.unbind(window, "mousemove", moveFn)
                            avalon.unbind(window, "mouseup", upFn)
                        }
                    })
                } else {
                    do {
                        if (curTH.className.indexOf("ui-grid-col") !== -1) {
                            break
                        }
                    } while ((curTH = curTH.parentNode));
                    var parent = curTH.parentNode
                    var children = avalon.slice(parent.children).filter(function(el) {
                        return el.className.indexOf("ui-grid-field-col") > -1
                    })
                    var prev = getPrev(children, curTH)
                    var next = getNext(children, curTH)
                    var prevBox = prev && getPrevBox(prev)
                    var nextBox = next && getNextBox(next)
                    curTH.style.zIndex = 10
                    var resizeStart = e.pageX
                    var flag = true
                    var origin = model.columnsOrder.concat()
                    function swap(event, index, other) {
                        resizeStart = event.pageX
                        var str = model.columnsOrder[index]
                        model.columnsOrder[index] = model.columnsOrder[other]
                        model.columnsOrder[other] = str
                        //  children = avalon.slice(parent.children)
                        prev = getPrev(children, curTH)
                        next = getNext(children, curTH)
                        prevBox = prev && getPrevBox(prev)
                        nextBox = next && getNextBox(next)
                    }
                    var moveFn = avalon.bind(window, "mousemove", function(e) {
                        e.preventDefault()
                        if (flag) {
                            curTH.style.left = (e.pageX - resizeStart) + "px"
                            if (e.pageX - resizeStart < 0) {//向左移动
                                if (prevBox && enter(prevBox, e)) {
                                    var index = children.indexOf(curTH)
                                    var other = children.indexOf(prev)
                                    parent.insertBefore(prev, curTH.nextSibling || null)
                                    swap(e, index, other)
                                }
                            } else {
                                if (nextBox && enter(nextBox, e)) {
                                    var index = children.indexOf(curTH)
                                    var other = children.indexOf(next)
                                    parent.insertBefore(next, curTH || null)
                                    swap(e, index, other)
                                }
                            }
                        }
                    })
                    var upFn = avalon.bind(window, "mouseup", function(e) {
                        e.preventDefault()
                        if (flag) {
                            flag = false
                            curTH.style.left = "0px"
                            if (model.columnsOrder.join("") !== origin.join("")) {
                                var datas = avalon.mix(true, [], rawDatas.slice(model.min, model.min + max + 5))
                                model.rows = datas
                            }
                            avalon.unbind(window, "mousemove", moveFn)
                            avalon.unbind(window, "mouseup", upFn)
                        }
                    })
                }
            }
            vm.showSlider = function() {
                if (!slideDown && !model.backboardToggle) {
                    slideDown = true
                    var target = document.getElementById(model.$id + "SlideDown")
                    target.style.display = "block"
                    miniFx(target, "height", 0, 22, 400)
                }
            }
            vm.hideSlider = function() {
                if (slideDown) {
                    slideDown = false
                    var target = document.getElementById(model.$id + "SlideDown")
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
            vm.renderTbody = function(e) {
                var curTop = this.scrollTop
                if (top !== curTop) {//如果是纵向滚动条
                    top = curTop
                    var min = Math.floor(top / options.rowHeight)
                    if (min + max <= total) {//刷新tbody
                        model.min = min
                        var datas = avalon.mix(true, [], rawDatas.slice(min, min + max + 5))
                        for (var i = 0, n = datas.length; i < n; i++) {
                            vm.rows.set(i, datas[i])
                        }
                        vm.srollTop = top
                    }
                }//如果是横向滚动条
                var curLeft = this.scrollLeft//移动表头
                if (left !== curLeft) {
                    left = curLeft
                    model.scrollLeft = -1 * left
                }
            }
        })
        // model.realWidth = getRealWidth(model)+20
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
        },
        checkCol: {
            type: 0,
            columnWidth: 40
        },
        checkColHTML: '<div class="ui-grid-td"  ms-css-width="checkCol.columnWidth">' +
                '   <input type="checkbox" class="ui-grid-checkbox" name="NAME" ms-checked="row.FIELD" ms-click="checkOne(min+$index)" /></div>',
        indexColHTML: '<div class="ui-grid-td"  ms-css-width="indexCol.columnWidth">{{min+$index}}</div>',
        indexCol: {
            type: 0,
            columnWidth: 30
        }
    }
    return avalon
})

