define(["avalon", "avalon.pagination", "text!mmGrid.html"], function(avalon, pagination, html) {

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
    function enter(dropper, event) {
        var right = dropper.left + dropper.width
        var bottom = dropper.top + dropper.height
        if (event.pageX > dropper.left && event.pageX < right && event.pageY > dropper.top && event.pageY < bottom) {
            return true
        }
    }
    //================================updateTbody=========================================
    function updateTbody(model, rawDatas) {
        var datas = avalon.mix(true, [], rawDatas.slice(model.startIndex, model.startIndex + model.perPages))

        var curLength = model.rows.length
        //调整行数
        while (curLength < datas.length) {
            curLength = model.rows.push(avalon.mix(true, {}, rawDatas[0]))
        }

        while (curLength > datas.length) {
            model.rows.pop()
            curLength--
        }
        //调整tbody的实际高度
        model.realHeight = datas.length * model.rowHeight
        //要显示的高度
        var scrollableRows = Math.min(datas.length, model.perPages, model.maxRows)

        model.viewportHeight = scrollableRows * model.rowHeight + scrollableRows
        //更新内容
        for (var i = 0, n = datas.length; i < n; i++) {
            model.rows.set(i, datas[i])
        }
    }
    //==========================一个迷你的动画函数=================================
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
        $element.addClass(" ui-grid ui-widget ui-helper-reset ui-corner-tl ui-corner-tr ui-helper-clearfix")
        var rawDatas = options.rows
        //每页最多可滚动的数量（不显示分页栏，默认是一页就全部拖出来）
        var scrollableRows = Math.min(rawDatas.length, options.maxRows)
        //用于决定tbody的真实高度
        var totalItems = rawDatas.length

        if (options.showPagination) {
            scrollableRows = Math.min(options.perPages, options.maxRows)
        }


        avalon.log("只显示" + scrollableRows + "行")
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
        if (checkCol.type) {
            if (!checkCol.field)
                throw Error("必须指定要关联的属性名")
            var replacement = options.checkColHTML
            replacement = replacement.replace("NAME", (checkCol.name || "avalon" + (new Date - 0)))
            if (checkCol.type == 2) {
                replacement = replacement.replace("FIELD", checkCol.field)
            } else {
                replacement = replacement.replace("row.FIELD", "startIndex+$index === checkedIndex")
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
            avalon.mix(vm, options)
            //非监控属性，用于提高性能
            vm.$skipArray = ["columnsOrder", "indexCol", "pagination"]
            //出现在可视区中的行
            vm.rows = []
            //表头各列的顺序（除去checkCol与indexCol）
            vm.columnsOrder = options.columnsOrder
            //生成表头的配置
            vm.columns = makeColumns(options.columns)
            //可视区的高度（用于制造纵向滚动条）
            vm.viewportHeight = scrollableRows * options.rowHeight + scrollableRows
            //可视区被裁剪掉的DIV的真实高度
            vm.realHeight = totalItems * options.rowHeight
            //可视区被裁剪掉的DIV的真实高度
            vm.realWidth = options.columns.length * options.columnWidth

            //data-with-sorted的回调
            vm.getColumnsOrder = function() {
                return vm.columnsOrder
            }
            //当前可视区显示的第一个item
            vm.startIndex = 0
            //总item数
            vm.totalItems = totalItems

            //checkCol的配置
            vm.checkCol = checkCol
            //indexCol的配置
            vm.indexCol = indexCol
            //checkCol在复选情况下，位于表头用于全选/非全选的checkbox的点击事件回调
            vm.checkAll = function() {
                var field = checkCol.field, checked = this.checked
                rawDatas.forEach(function(el) {
                    el[field] = checked
                })
                model.rows.forEach(function(el) {
                    el[field] = checked
                })
            }
            //checkCol在可用情况下，位于可视区的checkbox的点击事件回调
            vm.checkOne = function(index) {
                if (model.checkCol.type == 2) {
                    rawDatas[index][ checkCol.field ] = this.checked
                } else {
                    model.checkedIndex = index
                }
            }

            //获得表头的真实宽度（用于制造纵向滚动条）
            vm.getRealWidth = function(elem) {
                var thead = elem && elem.nodeType == 1 ? elem : this, ret = 0
                for (var i = 0, el; el = thead.childNodes[i++]; ) {
                    if (el.nodeType === 1) {
                        ret += el.offsetWidth
                    }
                }
                model.realWidth = ret + 17//17留给滚动条
            }
            //得到可视区某一个格子的宽
            vm.getCellWidth = function(name) {
                for (var i = 0, el; el = vm.columns[i++]; ) {
                    if (el.field === name) {
                        return el.width
                    }
                }
            }
            //得到可视区某一个格子的显示隐藏情况
            vm.getCellToggle = function(name) {
                for (var i = 0, el; el = vm.columns[i++]; ) {
                    if (el.field === name) {
                        return el.toggle
                    }
                }
            }
            //双击可视区某一个格子，可即时编辑此单元格（它是使用事件代理，绑定在#VMID#Tbody上）
            vm.editCell = function(e) {
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
            //失去焦点或回车时，还原为文本状态
            vm.uneditCell = function(e) {
                if (e.type === "blur" || (e.type === "keypress" && e.which == 13)) {
                    var index = avalon(this).data("index")
                    var name = avalon(this).data("key")
                    var obj = rawDatas[index]
                    if (obj) {
                        obj[name] = this.value
                    }
                    this.style.display = "none"
                    this.previousSibling.style.display = "block"
                }
            }
            //对某一列的所有行进行排序，使用事件代理
            vm.theadChick = function(e) {
                var target = e.target
                while (target.className.indexOf("ui-helper-sorter") == -1) {
                    target = target.parentNode
                    if (!target) {
                        break;
                    }
                }
                if (target && target.nodeType === 1) {
                    e.preventDefault()
                    var proxy = target.parentNode["data-vm"]
                    var field = proxy.field
                    var text = "innerText" in target ? target.innerText : target.textContent;
                    trend = text.trim() === "▲"
                    console.log(text)
                    vm.rows.sort(function(a, b) {
                        var ret = a[field] - b[field]
                        return ret * (trend ? 1 : -1)
                    })
                    var models = vm.rows.$model, j = vm.startIndex
                    for (var i = 0, el; el = models[i]; i++) {//同步原始数组
                        rawDatas[j + i] = el
                    }
                    target.innerHTML = trend ? '<span class="ui-icon ui-icon-triangle-1-s">▼</span>' : '<span class="ui-icon ui-icon-triangle-1-n">▲</span>'
                }
            }
            //实现表头拖动列宽，使用事件代理
            vm.theadDown = function(e) {
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
                                var datas = avalon.mix(true, [], rawDatas.slice(model.startIndex, model.startIndex + scrollableRows + 5))
                                model.rows = datas
                            }
                            avalon.unbind(window, "mousemove", moveFn)
                            avalon.unbind(window, "mouseup", upFn)
                        }
                    })
                }
            }
            //显示下拉菜单，用于向下收起tbody,露出backboard面板
            vm.showSlider = function() {
                if (!slideDown && !model.backboardToggle) {
                    slideDown = true
                    var target = document.getElementById(model.$id + "SlideDown")
                    target.style.display = "block"
                    miniFx(target, "height", 0, 22, 400)
                }
            }
            //收起下拉菜单
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
            //以动画方式从下到上滑出tbody
            vm.showTbody = function(e) {
                var target = e.target
                var id = model.$id + "Tbody"
                var tbody = document.getElementById(id)
                var height = tbody.parentNode.offsetHeight
                miniFx(tbody, "top", height, 0, 800)
                miniFx(target, "bottom", 0, -22, {
                    duration: 500,
                    complete: function() {
                        slideDown = model.backboardToggle = false
                        target.style.display = "none"
                    }
                })
            }
            //以动画方式从上向下隐藏tbody，露出tbody
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
            vm.showPagination = true
            //当拖动纵向滚动条时，更新可视区的数据，当拖动横向滚动条时，表头与tbody一起移动
            vm.renderTbody = function(e) {
                var curTop = this.scrollTop
                if (top !== curTop) {//如果是纵向滚动条
                    top = curTop
                    var min = Math.floor(top / options.rowHeight)
                    var goIf = vm.showPagination ? false : min + scrollableRows <= model.totalItems
                    if (goIf) {//刷新tbody
                        var datas = avalon.mix(true, [], rawDatas.slice(min, min + scrollableRows + 5))
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
            vm.getPageVM = function(pvm) {
                model.pagination = pvm
                pvm.$watch("currentPage", function(a) {
                    model.startIndex = (a - 1) * model.perPages
                    updateTbody(model, rawDatas, a)
                })
                //更换每页可滚动的项目数
                model.$watch("perPages", function(a) {
                    var pvm = model.pagination
                    //更新分页栏
                    pvm.perPages = parseInt(a)
                    pvm.pages = pvm.getPages(pvm)
                    //更新tbody
                    updateTbody(model, rawDatas)
                })
            }
            vm.showFilter = false
            vm.currentFilterField = ""
            vm.filterItemsCallback = function(e) {
                var curValue = this.value, field = vm.currentFilterField
                if (e.which === 13) {
                    if (curValue) {
                        var array = rawDatas.filter(function(el) {
                            return el[field] === curValue
                        })
                        updateTbody(model, array)
                    } else {
                        updateTbody(model, rawDatas)
                    }
                }
            }
            vm.showFilterCallback = function() {
                vm.showFilter = !vm.showFilter
            }
        })

        // model.realWidth = getRealWidth(model)+20
        //比要显示的行数多五个
        var datas = avalon.mix(true, [], rawDatas.slice(0, scrollableRows + 5))

        if (model.showPagination) {
            model.realHeight = model.perPages * model.rowHeight
            model.pagination.perPages = model.perPages
            model.pagination.total = model.totalItems
        }

        model.rows = datas


        avalon.nextTick(function() {
            element.innerHTML = html.replace(/#VMID#/g, model.$id)
            avalon.scan(element, [model].concat(vmodels))
        })
    }
    widget.defaults = {
        maxRows: 15,
        //可视区的格子的高
        rowHeight: 25,
        //表头的格子的高
        headerHeight: 25,
        columnWidth: 160,
        //纵向滚动条距滚动面板的顶部的距离（滚动面板可理解为可视区）
        srollTop: 0,
        //横向滚动条距滚动面板的左侧的距离（滚动面板可理解为可视区）
        scrollLeft: 0,
        getColumnTitle: function() {
            return ""
        },
        //用于控制 表头列排序时出现的虚线 的显隐
        resizeToggle: false,
        //用于控制 被可视区遮住的那个backboard面板（它用于配置各列的显示隐藏） 的显隐
        backboardToggle: false,
        // 表头列排序时出现的虚线 距离GRID最左侧的距离 
        resizeLeft: 1,
        checkColHTML: '<div class="ui-grid-td"  ms-css-width="checkCol.columnWidth">' +
                '   <input type="checkbox" class="ui-grid-checkbox" name="NAME" ms-checked="row.FIELD" ms-click="checkOne(startIndex+$index)" /></div>',
        indexColHTML: '<div class="ui-grid-td"  ms-css-width="indexCol.columnWidth">{{startIndex+$index}}</div>',
        //checkCol在单选情况下，被选中的那个索引值
        checkedIndex: NaN,
        checkCol: {
            type: 0,
            columnWidth: 40
        },
        indexCol: {
            type: 0,
            columnWidth: 30
        },
        limitList: [20, 30, 40, 50],
        perPages: 20,
        showPagination: true,
        showFilterText: "find",
        showFilterClass: "ui-grid-filter-btn",
        pagination: {
            showPages: 5,
            perPages: 20,
            alwaysShowPrev: true,
            alwaysShowNext: true
        },
        formatLimitText: function(a) {
            return "每页" + a + "条"
        }
    }
    return avalon
})

