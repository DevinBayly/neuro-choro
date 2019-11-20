class Application {
  // starts off with the add pane button
  // holds all panes?
  constructor() {
    // create the button
    this.panes = []
  }
  // changed?
  async addButton() {
    this.btndiv = document.createElement("div")
    this.btndiv.id = "btnholder"
    this.btn = document.createElement("button")
    this.btn.onclick = async () => {
      // create a pane
      let newPane = new Pane(this.panes.length)
      // here's the point where we can connect up the various parts
      // finish pane loading

      // create ctrloptions
      this.ctrlop = new CtrlOp(newPane.paneDiv)
      // loads the data and such
      await this.ctrlop.init()

      // create the canvas
      this.can = new Canvas(newPane.paneDiv, this.ctrlop.data)

      this.panes.push(newPane)
    }
    this.btn.setAttribute("id", "addbtn")
    this.btn.innerHTML = "Add Pane"
    this.btndiv.append(this.btn)
    document.body.append(this.btndiv)
  }
}

class Pane {
  // initiates construction of the ctrl op object for the pane all the buttons and stuff that have control over the canvas
  // initiates creation of the canvas
  constructor(count) {
    // generate the pane div
    // want radio w 3 buttons, range slider, selection form for loading
    let paneDiv = document.createElement("div")
    paneDiv.className = "pane"
    paneDiv.setAttribute("id", "pane" + count)
    this.paneDiv = paneDiv
    document.body.append(this.paneDiv)
    // create the ctrlop and canvas
  }
}

class CtrlOp {
  // file loading, val columns, filters, view radio buttons, and slice sliders
  constructor(paneDiv) {
    let ctrlDiv = document.createElement("div")
    ctrlDiv.className = "ctrlDiv"
    // add a section to the ctrldiv that clicking and dragging will actually move the entire paneholder
    paneDiv.append(ctrlDiv)
    this.paneDiv = paneDiv
    this.ctrlDiv = ctrlDiv
  }
  // this is called in the button click scope, where I believe we are permitted to perform an await before making the canvas
  async init() {
    // setup the radio buttons
    this.mkradio("axial")
    this.mkradio("sagittal")
    this.mkradio("coronal")
    // selected is the radio button we have selected
    this.radioSelected = "sagittal" // default

    // instantiate loader
    await this.loader()

    // create the, column selectors, sliders, and the filters
    this.createSelector()

    // create the brain slice slider
    this.createSlider()

    // create the activity and category filters
    this.createFilters()

  }
  // in preparation for iodide version no more fetching in this way is necessary, just look for data at a specific spot on local host and then we will change it later on
  async loader() {
    // make the form that uploads the data
    await fetch("./src/HCP-MMP1_List.csv").then(
      res => {
        return res.text()
      }
    ).then(text => {
      this.csvDataReader(text)
    })
    // fetch the region boundary data
    await fetch("src/GeoJson_HCP-MMP1/total_small_parsed.json").then(res => res.json()).then(j => {
      this.regionBoundaryData = j
    })
  }
  csvDataReader(csvRawString) {
    // !! think carefully about the types of errors that might come up here
    // turn this into a json that has the names of the columns as fields, and each has an array which is the data that follows
    let lines = csvRawString.split("\r")
    let headers = lines[0].split(",")
    this.data = {}
    headers.map(e => {
      this.data[e] = []
    })
    // read through the rest of the lines and add them to the data
    // although if this were running off a server, we could convert it right then, but then we have hippa concerns? ask dianne
    for (let iLine = 1; iLine < lines.length; iLine++) {
      let entries = lines[iLine].split(",")
      for (let i = 0; i < entries.length; i++) {
        this.data[headers[i]].push(entries[i])
      }
    }
  }
  mkradio(view) {
    let rad = document.createElement("input")
    rad.type = "radio"
    rad.id = "radio" + view
    rad.name = "view"
    rad.value = view
    let label = document.createElement("label")
    label.setAttribute("for", rad.id)
    label.innerHTML = view
    let div = document.createElement("div")
    div.className = "radcontainer"
    div.id = "radcontainer" + view
    div.append(rad)
    div.append(label)
    this.ctrlDiv.append(div)
    // add this.radioSelected on change
    rad.addEventListener("click", () => {
      this.radioSelected = rad.value
      // also update the max for the slider
      this.slider.max = this.sliderSlices[this.radioSelected].length - 1
    })
  }
  // this is the part for creating the column selection area
  // deals with the csv data
  createSelector() {
    // delete previous selection tools

    // this is the selection element that is populated by the column names in the csv
    let valueColumnSelect = document.createElement("select")
    for (let key of Object.keys(this.data)) {
      let option = document.createElement("option")
      option.value = key
      option.innerHTML = key
      valueColumnSelect.append(option)
    }
    this.ctrlDiv.append(valueColumnSelect)
    valueColumnSelect.onchange = () => {
      // parse the data into numeric
      let numericData = this.data[valueColumnSelect.value].map(e => parseFloat(e))
      this.coldata = numericData
      // trigger a valcolchange event
      // this will make the filters update themselves, and make the canvas redraw the 
      let e = new Event("valcolchange")
      // update the canvas columdata somehow
      this.ctrlDiv.dispatchEvent(e)
    }
  }
  prepRangeData() {
    let slicesByView = {
      "sagittal": [],
      "axial": [],
      "coronal": []
    }
    for (let n in this.regionBoundaryData) {
      if (n.search(/cor/) == 0) {
        slicesByView["coronal"].push(n)
      }
      if (n.search(/sag/) == 0) {
        slicesByView["sagittal"].push(n)
      }
      if (n.search(/ax/) == 0) {
        slicesByView["axial"].push(n)
      }
    }
    let sortfunc = (x, y) => {
      let xmm = parseInt(x.match(/(-?\d+)(mm)?\..*json/)[1])
      let ymm = parseInt(y.match(/(-?\d+)(mm)?\..*json/)[1])
      return xmm - ymm
    }
    slicesByView.axial.sort(sortfunc)
    slicesByView.sagittal.sort(sortfunc)
    slicesByView.coronal.sort(sortfunc)
    this.sliderSlices = slicesByView
    // get the array of values
    this.sliderMeasurements = {}
    this.sliderMeasurements.axial = slicesByView.axial.map(sl => {
      return (sl.match(/(-?\d+mm)?.json/)[1])
    })
    this.sliderMeasurements.sagittal = slicesByView.sagittal.map(sl => {
      return (sl.match(/(-?\d+mm)?.json/)[1])
    })
    this.sliderMeasurements.coronal = slicesByView.coronal.map(sl => {
      return (sl.match(/(-?\d+mm)?.json/)[1])
    })
  }
  // deals with the boundary data 
  createSlider() {
    //initiate the slider
    let range = document.createElement("input")
    range.id = "rangeslider"
    let label = document.createElement("label")
    label.id = "rangesliderlabel"
    range.name = "slicerange"
    range.type = "range"
    label.setAttribute("for", "slicerange")
    this.ctrlDiv.append(range)
    this.ctrlDiv.append(label)
    this.slider = range
    this.sliderlabel = label
    // makes several attributes helpful for handling slider change
    this.prepRangeData()
    // add the on input event emitter  for when slider moves
    // 
    this.slider.oninput = () => {
      this.selectedSliceIndex = parseInt(this.slider.value)
      // now determine which slice we are supposed to draw the boundaries of provided the selected brain view an the slice index
      let ind = parseInt(range.value)
      // having trouble getting the
      let name = this.sliderSlices.slices[this.radioSelected][ind]
      this.sliderlabel.innerHTML = this.sliderMeasurements[this.radioSelected][ind]
      // provide the name of the slice to the canvas drawing machinery
      // ....
      let e = new Event("sliderchange")
      this.ctrlDiv.dispatchEvent(e)
    }
  }
  // prepare the filters
  createFilters() {
    this.activityFilter = new ActivityFilter(this.ctrlDiv,this.coldata)
    this.activityFilter.init()
  }

  other() {
    //create the activity filterselector
    let filter = activityFilter(holder)
    filter.create()

    // this is a column filter set of options used to further pair down the activity data that eventually colors in the brain regions
    let catFilter = altColumnFilterHolder()
    catFilter.create(canvasHolder, data)

    // when we select a column as the value column of the activity data coloring we must grab the data from there and initiate the downstream draw
  }
}

class ActivityFilter {
  constructor(ctrlDiv, data) {
    this.min = undefined
    this.max = undefined
    this.ctrlDiv = ctrlDiv
    this.data = data
  }
  init() {
    // make a range slider that updates the self filter function which is called later on activity data
    let rangeWidth = this.ctrlDiv.getBoundingClientRect()
    let min = new divMaker(rangeWidth.width / 4, this.ctrlDiv)
    let max = new divMaker(rangeWidth.width / 4, this.ctrlDiv)
    // this si the amount of screen space that the filter div's can move, minus the width of the element
    this.width = (rangeWidth.width / 4) - 30
    // create labels
    this.minlabel = document.createElement("p")
    this.minlabel.id = "minlabel"
    this.minlabel.className = "filterLabel"
    this.maxlabel = document.createElement("p")
    this.minlabel.id = "maxlabel"
    this.maxlabel.className = "filterLabel"
    let labelholder = document.createElement("div")
    labelholder.id = "labelholder"
    // prevent sliders from going over each other
    min.additionalLimit = (v) => {
      // stay below the max point
      let maxleft = parseInt(max.element.style.left)
      if (v > maxleft) {
        min.element.style.left = `${maxleft}px`
        this.min = maxleft
        // update min label
        this.minlabel.innerHTML = (maxleft * this.absmax / (this.width)).toFixed(5)
        return true
      }
      this.min = v
      // update min label and account for the divslider width
      this.minlabel.innerHTML = (v * this.absmax / (this.width)).toFixed(5)
      return false
    }
    max.additionalLimit = (v) => {
      let minleft = parseInt(min.element.style.left)
      if (v < minleft) {
        max.element.style.left = `${minleft}px`
        this.max = minleft
        this.maxlabel.innerHTML = (minleft * this.absmax / (this.width)).toFixed(5)
        return true
      }
      this.maxlabel.innerHTML = (v * this.absmax / (this.width)).toFixed(5)
      this.max = v
      return false
    }
    labelholder.append(this.minlabel, this.maxlabel)
    this.ctrlDiv.append(min.element)
    this.ctrlDiv.append(max.element)
    this.ctrlDiv.append(labelholder)
    // once placed, set this to keep in correct spot, make them sit on same line
    max.element.style.top = `-30px` // overlap the element with the other
    max.element.style.left = "50px"
  }
  filter() {
    // calculate the actual min activity value
    let activitymin = this.absmax * this.min / this.width
    let activitymax = this.absmax * this.max / this.width
    return this.data.map(e => {
      if (e > activitymin && e < activitymax) {
        return e
      }
      return NaN
    })
  }
  addData(data) {
    this.data = data
  }
  setbounds(absmin, absmax) {
    this.absmax = absmax
    this.absmin = absmin
  }
}


class divMaker {
  constructor(width, holder) {
    let d = document.createElement("div")
    this.element = d
    d.style.height = "30px"
    d.style.width = "30px"
    d.style.position = "relative"
    let move = (e) => {
      let x = e.clientX - holder.getBoundingClientRect().left
      let left = x
      if (left > width - 30) { // because the size of the div at the moment is 30
        left = width - 30
      }
      if (left < 0) {
        left = 0
      }
      if (this.additionalLimit(left)) {
        console.log("stopped marker")
      } else {
        this.element.style.left = `${left}px`
      }
      this.v = parseInt(this.element.style.left)
    }
    let cancelMove = (e) => {
      console.log("cancelling")
      document.removeEventListener("mousemove", move)
      document.removeEventListener("mouseup", cancelMove)
      // emit event that canvas must redraw
      let filterEvent = new Event("activityfilterchange")
      this.element.dispatchEvent(filterEvent)
    }
    let click = () => {
      document.addEventListener("mousemove", move)
      document.addEventListener("mouseup", cancelMove)
    }
    d.addEventListener("mousedown", click)
    d.style.background = "#00000052"
  }
  additionalLimit(v) {
    return undefined
  }
}


class Canvas {
  // holds stuff like the global min/max, the invisible and visible canvases, the boundary lines, and various interpolators
  constructor(paneDiv, data) {
    this.canvas = document.createElement("canvas")
    // other versions of teh data will be around later,
    this.initialData = data
  }
}





//class Application {
//  constructor() {
//    this.brain = {}
//    this.globals = {}
//    this.csvRegionArray = {}
//    this.regNameToValueMap = {}
//    // this is the number of panes active 
//    this.count = 0
//    // slicedata
//    // maps that support the click for region name usecase
//    this.colToRegMap = {}
//    this.regToColMap = {}
//    // add the button
//    this.addButton()
//    // create the holder elements
//
//  }
//  addButton() {
//    this.btndiv = document.createElement("div")
//    btndiv.id = "btnholder"
//    this.btn = document.createElement("button")
//    this.btn.onclick = () => {
//      // create a pane
//      this.first = this.pane()
//    }
//    this.btn.setAttribute("id", "addbtn")
//    this.btn.innerHTML = "Add Pane"
//    this.btndiv.append(btn)
//    document.body.append(this.btndiv)
//  }
//
//  altColumnFilterHolder() {
//    let ob = {}
//    ob.create = (holder, data) => {
//      // attributes 
//      //  data
//      ob.data = data
//      //  non-activity column filters
//      ob.filtersList = []
//      // put in the space next to the canvas
//      let filterDiv = document.createElement("div")
//      holder.append(filterDiv)
//      let createFilterButton = document.createElement("button")
//      createFilterButton.innerHTML = "Add Alt column filter"
//      createFilterButton.addEventListener("click", () => {
//        // call the create filter event, pass in the holder's data element,
//        // append it to the holders
//        let columnfilter = altColumnFilter()
//        columnfilter.create(filterDiv, ob.data)
//        ob.filtersList.push(columnfilter)
//      })
//      holder.append(createFilterButton)
//    }
//    // run categorical filters on the object's data
//    // pass that data to the drawing tool so that it doesn't have to re filter every single time the other aspects of the program get used
//    return ob
//  }
//  pane() {
//    // increment the pane number
//    this.count += 1
//    // want radio w 3 buttons, range slider, selection form for loading
//
//    let paneDiv = document.createElement("div")
//    paneDiv.className = "pane"
//    paneDiv.setAttribute("id", "pane" + this.count)
//    let ctrlDiv = document.createElement("div")
//    ctrlDiv.className = "ctrlDiv"
//    // add a section to the ctrldiv that clicking and dragging will actually move the entire paneholder
//    paneDiv.append(ctrlDiv)
//    // radionnum is used when there are more than one pane around, at the moment this isn't actually going on.
//    let mkradio = (view, radionum) => {
//      let rad = document.createElement("input")
//      rad.type = "radio"
//      rad.id = "radio" + view
//      rad.name = "view" + radionum
//      rad.value = view
//      let label = document.createElement("label")
//      label.setAttribute("for", rad.id)
//      label.innerHTML = view
//      let div = document.createElement("div")
//      div.className = "radcontainer"
//      div.id = "radcontainer" + view
//      div.append(rad)
//      div.append(label)
//      ctrlDiv.append(div)
//    }
//    // setup the radio buttons
//    // !! radio button todo
//    mkradio("axial", this.count)
//    mkradio("sagittal", this.count)
//    mkradio("coronal", this.count)
//    // setup file loader field
//    document.body.append(paneDiv)
//    this.ctrlDiv = ctrlDiv
//    this.paneDiv = paneDiv
//  }
//  calcGlobals(activationData) {
//    // scanCol is the column that has the data we care about putting in the color fill
//    // this returns a summary object that knows things about the size of the brain json dimensions and also the min and max of hte scan data
//    let globals = [1000, 1000, -1000, -1000]
//    for (let feature of this.brain.features) {
//      // likely nota  loop because coordinates is a single element array
//      for (let line of feature.geometry.coordinates) {
//        for (let pt of line) {
//          if (pt[0] < globals[0]) {
//            globals[0] = pt[0]
//          }
//          if (pt[1] < globals[1]) {
//            globals[1] = pt[1]
//          }
//          if (pt[0] > globals[2]) {
//            globals[2] = pt[0]
//          }
//          if (pt[1] > globals[3]) {
//            globals[3] = pt[1]
//          }
//        }
//      }
//    }
//    this.globals = globals
//    this.ratio = glthis.ls[3] / glthis.ls[2]
//    this.scanDatamin = 0
//    this.scanDatamax = 0
//    for (let row of activationData) {
//      if (row > this.scanDatamax) {
//        this.scanDatamax = parseFloat(row)
//      }
//      if (row < this.scanDatamin) {
//        this.scanDatamin = parseFloat(row)
//      }
//    }
//    // this normalizes the value from the scan data into the range 0 to 1 for color interpolation
//    let scanScalar = interpolator()
//    scanScalar.setup(ob.scanDatamin, 0, ob.scanDatamax, 1)
//    this.scanScalar = scanScalar
//    // calculate the min and maxes of the scan data for each scan
//  }
//
//
//  async fetchData() {
//    // fetch the data from server on iodide this will be a local link
//    this.res = await fetch("http://localhost:8080/src/GeoJson_HCP-MMP1/total_small_parsed.json")
//    this.sliceData = await this.res.json()
//  }
//  selectorCreators() {
//    // delete previous selection tools
//    let prevSelect = canvasHolder.querySelector("select")
//    if (prevSelect) {
//      prevSelect.remove()
//    }
//    let prevRange = canvasHolder.querySelector("#rangeslider")
//    if (prevRange) {
//      prevRange.remove()
//    }
//    let prevLabel = canvasHolder.querySelector("#rangesliderlabel")
//    if (prevLabel) {
//      prevLabel.remove()
//    }
//
//    // this is the selection element that is populated by the column names in the csv
//    let valueColumnSelect = document.createElement("select")
//    for (let key of Object.keys(data.data)) {
//      let option = document.createElement("option")
//      option.value = key
//      option.innerHTML = key
//      valueColumnSelect.append(option)
//    }
//    holder.append(valueColumnSelect)
//
//    //create the activity filterselector
//    let filter = activityFilter(holder)
//    filter.create()
//
//    // this is a column filter set of options used to further pair down the activity data that eventually colors in the brain regions
//    let catFilter = altColumnFilterHolder()
//    catFilter.create(canvasHolder, data)
//
//    // when we select a column as the value column of the activity data coloring we must grab the data from there and initiate the downstream draw
//    valueColumnSelect.onchange = () => {
//
//      //create the regionName, activity value object to pass along so drawLine has an easier time with filling
//
//      // create the drawings from the slice data
//      // parse the data into numeric
//      let numericData = data.data[valueColumnSelect.value].map(e => parseFloat(e))
//      regToValueMap = {}
//      csvRegionArray = data.data["regionName"].map((e, i) => {
//        // remove whitespace
//        let name = e.replace(/\s/, "")
//        // populate the region name and value array for drawLine time
//        regNameToValueMap[name] = numericData[i]
//        return name
//      })
//      filter.addData(numericData)
//      let drawing = createCanvasDrawing(holder, canvasHolder, numericData, filter, catFilter)
//      drawing.run()
//    }
//  }
//  activityFilter() {
//    let ob = {}
//    ob.min = undefined
//    ob.max = undefined
//    ob.addData = (data) => {
//      ob.data = data
//    }
//    ob.setbounds = (absmin, absmax) => {
//      ob.absmin = absmin
//      ob.absmax = absmax
//    }
//    ob.create = () => {
//      // make a range slider that updates the self filter function which is called later on activity data
//      let rangeWidth = holder.getBoundingClientRect()
//      let min = makediv(rangeWidth.width / 4, holder)
//      min.create()
//      let max = makediv(rangeWidth.width / 4, holder)
//      max.create()
//      // this si the amount of screen space that the filter div's can move, minus the width of the element
//      ob.width = (rangeWidth.width / 4) - 30
//      // create labels
//      ob.minlabel = document.createElement("p")
//      ob.minlabel.id = "minlabel"
//      ob.minlabel.className = "filterLabel"
//      ob.maxlabel = document.createElement("p")
//      ob.minlabel.id = "maxlabel"
//      ob.maxlabel.className = "filterLabel"
//      let labelholder = document.createElement("div")
//      labelholder.id = "labelholder"
//      // prevent sliders from going over each other
//      min.additionalLimit = (v) => {
//        // stay below the max point
//        let maxleft = parseInt(max.element.style.left)
//        if (v > maxleft) {
//          min.element.style.left = `${maxleft}px`
//          ob.min = maxleft
//          // update min label
//          ob.minlabel.innerHTML = (maxleft * ob.absmax / (ob.width)).toFixed(5)
//          return true
//        }
//        ob.min = v
//        // update min label and account for the divslider width
//        ob.minlabel.innerHTML = (v * ob.absmax / (ob.width)).toFixed(5)
//        return false
//      }
//      max.additionalLimit = (v) => {
//        let minleft = parseInt(min.element.style.left)
//        if (v < minleft) {
//          max.element.style.left = `${minleft}px`
//          ob.max = minleft
//          ob.maxlabel.innerHTML = (minleft * ob.absmax / (ob.width)).toFixed(5)
//          return true
//        }
//        ob.maxlabel.innerHTML = (v * ob.absmax / (ob.width)).toFixed(5)
//        ob.max = v
//        return false
//      }
//      labelholder.append(ob.minlabel, ob.maxlabel)
//      holder.append(min.element)
//      holder.append(max.element)
//      holder.append(labelholder)
//      // once placed, set this to keep in correct spot, make them sit on same line
//      max.element.style.top = `-30px` // overlap the element with the other
//      max.element.style.left = "50px"
//    }
//    ob.filter = () => {
//      // calculate the actual min activity value
//      let activitymin = ob.absmax * ob.min / ob.width
//      let activitymax = ob.absmax * ob.max / ob.width
//      return ob.data.map(e => {
//        if (e > activitymin && e < activitymax) {
//          return e
//        }
//        return NaN
//      })
//    }
//    return ob
//  }
//  drawLine(linedata, drawing, activationData) {
//    //linedata  = {points,region}
//    let ob = {}
//    // need canvas ref
//    //create interpolator
//    //map xmin - xmax to 0 to 5000 or whatever width is do the same for y
//    let xinterp = interpolator()
//    xinterp.setup(globalinfo.globals[0], 0 + 10, globalinfo.globals[2], 500 + 10)
//    let yinterp = interpolator()
//    yinterp.setup(globalinfo.globals[1], (500 + 10) * globalinfo.ratio, globalinfo.globals[3], 10)// extra 10is the margin split intwo
//    //TODO find better version of how to structure so that the margin can be programmatically set
//    ob.draw = () => {
//      drawing.ctx.beginPath()
//      drawing.invisictx.beginPath()
//      let red = {
//        r: 255,
//        g: 0,
//        b: 0,
//      }
//      let yellow = {
//        r: 128,
//        g: 128,
//        b: 128
//      }
//      let first = linedata.points[0]
//      let x = xinterp.calc(first[0])
//      let y = yinterp.calc(first[1])
//      drawing.ctx.moveTo(x, y)
//      drawing.invisictx.moveTo(x, y)
//      for (let i = 1; i < linedata.points.length; i++) {
//        let pt = linedata.points[i]
//        let x = xinterp.calc(pt[0])
//        let y = yinterp.calc(pt[1])
//        drawing.ctx.lineTo(x, y)
//        drawing.invisictx.lineTo(x, y)
//      }
//      drawing.ctx.closePath()
//      drawing.invisictx.closePath()
//      if (regNameToValueMap != undefined) {
//        if (regNameToValueMap[linedata.region]) {
//          let scanData = regNameToValueMap[linedata.region]
//          let t = globalinfo.scanScalar.calc(scanData)
//          let lerpc = LerpCol(yellow, red, t, 2)
//          drawing.ctx.fillStyle = lerpc
//          drawing.ctx.fill()
//          // query the region to color map
//          activity = true
//        }
//      } else {
//        // leave the section gray
//        drawing.ctx.fillStyle = "gray";
//        drawing.ctx.fill();
//      }
//      // color on the invisible canvas, this happens regardless of activity
//      drawing.invisictx.fillStyle = `rgb(${regToColMap[linedata.region][0]},${regToColMap[linedata.region][1]},${regToColMap[linedata.region][2]})`
//      drawing.invisictx.fill()
//
//
//    }
//    return ob
//  }
//}
//
//// things that don't depuend on internal values are left as helper functions on the outside
//
//// this exists to separate the invisible color canvas regions so that clicks upon the screen can  resolve to a color string that can confidently identify the region that is clicked
//let color_collection = (rnum) => {
//  ob = {}
//  // this is the number of color chunks for each of the rgb channels
//  let colordim = Math.ceil(Math.pow(rnum, 1 / 3))
//  console.log(colordim, "is the cube of ", rnum)
//  ob.array = []
//  // nesting 3 deep, but each should be short
//  for (let r = 0; r < colordim; r++) {
//    for (let g = 0; g < colordim; g++) {
//      for (let b = 0; b < colordim; b++) {
//        let base = 255 / colordim // the base is permuted by each of the rgb loop variables
//        // must round because the canvas sampling by pixel doesn't return floats
//        ob.array.push([Math.round(base * r), Math.round(base * g), Math.round(base * b)])
//      }
//    }
//  }
//  return ob
//}
//
//let parametricInterp = () => {
//  let ob = {}
//  ob.setupRun = (x0, y0, x1, y1, step) => {
//    let xys = []
//    for (let t = 0; t < 1; t += step) {
//      xys.push(ob.calct(x0, y0, x1, y1, t))
//    }
//    return xys
//  }
//  ob.calct = (x0, y0, x1, y1, t) => {
//    return [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t]
//  }
//  return ob
//}
//let interpolator = () => {
//  let ob = {}
//  ob.setup = (x0, y0, x1, y1) => {
//    ob.x0 = x0
//    ob.y0 = y0
//    ob.x1 = x1
//    ob.y1 = y1
//  }
//  ob.calc = (x) => {
//    return (ob.y1 - ob.y0) / (ob.x1 - ob.x0) * x + (ob.x1 * ob.y0 - ob.y1 * ob.x0) / (ob.x1 - ob.x0)
//  }
//  return ob
//}
//
//let LerpCol = (c1, c2, t, jitter) => {
//  let red = Math.round(c1.r + (c2.r - c1.r) * t + Math.random() * jitter)
//  if (red > 255) {
//    red = 255
//  }
//  let blue = Math.round(c1.b + (c2.b - c1.b) * t + Math.random() * jitter)
//  if (blue > 255) {
//    blue = 255
//  }
//  let green = Math.round(c1.g + (c2.g - c1.g) * t + Math.random() * jitter)
//  if (green > 255) {
//    green = 255
//  }
//  return `rgb(${red},${green},${blue})`
//
//}
//
//
//
//
//
//let setup = (lwidth, paneHolder) => {
//  let ob = {}
//  ob.outerHolder = paneHolder
//  ob.begin = () => {
//    // the invisible canvas is used to assist with the mapping of clicks to uniquely colored regions whose pixels can be queried for color strings mapping to region names
//    // easy hack to keep performance and accuracy of interactivity on canvas
//    let invisican = document.createElement("canvas")
//    invisican.id = "invisican"
//    let can = document.createElement("canvas")
//    ob.innerHolder = document.createElement("div")
//    ob.innerHolder.className = "innerholder"
//    ob.innerHolder.append(can)
//    paneHolder.append(ob.innerHolder)
//    ob.can = can
//    ob.invisican = invisican
//    ob.ctx = can.getContext("2d")
//    ob.invisictx = invisican.getContext("2d")
//    let getPos = (e) => {
//      // the drawing holds both canvases, so we can get the x,y from the click, and apply it to the invisible can
//      let rect = ob.can.getBoundingClientRect()
//      let x = e.clientX - rect.left
//      let y = e.clientY - rect.top
//      let ctx = ob.invisictx
//      // activate the border point-in-polygon algorithm
//      // get image data
//      // loop until we move right to get a pix value that is above certain threshold green
//      let pix = Array(...ctx.getImageData(x, y, 1, 1).data.slice(0, 3))
//      // query the invisible map
//      if (colToRegMap[JSON.stringify(pix)] != undefined) {
//        // make a little side box with the info in it
//        // take away a chunk of the image at that area
//        let rightDiv = document.createElement("div")
//        rightDiv.id = "tooltip"
//        rightDiv.innerHTML = `
//            <h3>Selected Region
//              <p class="tooltip-child">
//                    ${ colToRegMap[JSON.stringify(pix)]}
//              </p>
//              <p class="tooltip-child">
//            activity value: hey this is missing!
//              </p>
//            </h3>
//            `
//        //append to canvas element if possible
//        ob.innerHolder.append(rightDiv)
//        setTimeout(() => {
//          // replace the original pixels
//          rightDiv.remove()
//        }, 3500)
//      }
//    }
//    ob.can.addEventListener("click", getPos)
//  }
//  ob.resize = (height, width, margin) => {
//    ob.can.height = height + margin
//    ob.can.width = width + margin
//    ob.invisican.height = height + margin
//    ob.invisican.width = width + margin
//    ob.ctx.lineWidth = lwidth
//    ob.invisictx.lineWidth = lwidth
//  }
//  return ob
//}
//
//
//let drawToCanvas = (drawing, upperData, activationData) => {
//  let ob = {}
//  // establish a color map for the invisible canvas
//  let cc = color_collection(upperData.features.length)
//  // create maps
//  upperData.features.map((f, i) => {
//    // this is for the fill on the invisible canvas
//    regToColMap[f.properties.regionName] = cc.array[i]
//    colToRegMap[JSON.stringify(cc.array[i])] = f.properties.regionName
//  })
//  console.log(regToColMap, colToRegMap)
//
//  ob.mapFeatures = () => {
//    for (let feature of upperData.features) {
//
//      // drawing has can and ctx attributes
//      // find a way get to the data we need here
//      // almost convinced there will only be one loop performed here
//      for (let pline of feature.geometry.coordinates) {
//        //let data_bound = {coords:line,properties
//        //make copy of line data and bind in the region name
//        let drawingData = {
//          points: pline,
//          region: feature.properties.regionName
//        }
//        let line = drawLine(drawingData, drawing, activationData)
//        line.draw()
//      }
//    }
//  }
//
//  // drawing has can and ctx attributes
//  // find a way get to the data we need here
//  return ob
//}
//
//
//// lifted from stack overflow
//
////for each state have something which goes through the 
////  coordinates is an array of 
////
//// aim for as much functional as possible
//let rangePrep = () => {
//  // we will create and sort 3 element array of the data
//  let ob = {}
//  let slicesByView = {
//    "sagittal": [],
//    "axial": [],
//    "coronal": []
//  }
//  for (let n in sliceData) {
//    if (n.search(/cor/) == 0) {
//      slicesByView["coronal"].push(n)
//    }
//    if (n.search(/sag/) == 0) {
//      slicesByView["sagittal"].push(n)
//    }
//    if (n.search(/ax/) == 0) {
//      slicesByView["axial"].push(n)
//    }
//  }
//  let sortfunc = (x, y) => {
//    let xmm = parseInt(x.match(/(-?\d+)(mm)?\..*json/)[1])
//    let ymm = parseInt(y.match(/(-?\d+)(mm)?\..*json/)[1])
//    return xmm - ymm
//  }
//  slicesByView.axial.sort(sortfunc)
//  slicesByView.sagittal.sort(sortfunc)
//  slicesByView.coronal.sort(sortfunc)
//  ob.slices = slicesByView
//  // get the array of values
//  ob.measurements = {}
//  ob.measurements.axial = slicesByView.axial.map(sl => {
//    return (sl.match(/(-?\d+mm)?.json/)[1])
//  })
//  ob.measurements.sagittal = slicesByView.sagittal.map(sl => {
//    return (sl.match(/(-?\d+mm)?.json/)[1])
//  })
//  ob.measurements.coronal = slicesByView.coronal.map(sl => {
//    return (sl.match(/(-?\d+mm)?.json/)[1])
//  })
//  return ob
//}
//
//let sliceSelect = (paneHolder) => {
//  let ob = {}
//  ob.createImage = (slice, drawing, activationData) => {
//    drawing.ctx.clearRect(0, 0, drawing.can.height, drawing.can.width)
//    brain = sliceData[slice]
//    globalinfo = globals(activationData)
//    drawing.resize(500 * globalinfo.ratio, 500, 20)
//    // data height vs width ration
//    // call it draw on Canvas
//    let allfeatures = drawToCanvas(drawing, brain, activationData)
//    allfeatures.mapFeatures()
//  }
//  return ob
//}
//
//
//
//let pane = (number) => {
//  let ob = {}
//
//  let createCanvasDrawing = (ctrlDiv, canvasHolder, activationData, activityfilter, categoricalFilters) => {
//    let ob = {}
//    ob.run = () => {
//
//      let sliceSelection = sliceSelect(canvasHolder)
//      //delete previous range slider 
//      let range = document.createElement("input")
//      range.id = "rangeslider"
//      let label = document.createElement("label")
//      label.id = "rangesliderlabel"
//      range.name = "slicerange"
//      range.type = "range"
//      label.setAttribute("for", "slicerange")
//      ctrlDiv.append(range)
//      ctrlDiv.append(label)
//      // check for existing canvas, delete if found
//      let prevCan = canvasHolder.querySelector("canvas")
//      if (prevCan) {
//        prevCan.remove()
//      }
//      let drawing = setup(1, canvasHolder)
//      drawing.begin()
//      // only run slice selection when we have data 
//      let rangeData = rangePrep()
//      // defaults for the range slider
//      range.value = 20
//      range.min = 0
//      range.step = 1
//      // make the range slider tied to slice lookup
//      // start with sagittal
//      let selected = "sagittal"
//      let getRadioSelected = () => {
//        if (canvasHolder.querySelector("#radiosagittal").checked) {
//          selected = "sagittal"
//        }
//        if (canvasHolder.querySelector("#radiocoronal").checked) {
//          selected = "coronal"
//        }
//        if (canvasHolder.querySelector("#radioaxial").checked) {
//          selected = "axial"
//
//        }
//        range.max = rangeData.slices[selected].length - 1
//      }
//      // force saggital to be selected at start by default
//      canvasHolder.querySelector("#radiosagittal").checked = true
//      // grab measurement value from correct array provided the range value
//      label.innerHTML = rangeData.measurements[selected][range.value]
//
//      // actual beginning of process to draw a brain slice, start at random position
//      // important stuff happens here! such as creation of globalinfo used right after
//      sliceSelection.createImage(rangeData.slices[selected][range.value], drawing, activationData)
//
//
//      // set the activity bounds at their lowest and highest possible values, manipulation will occur folling this
//      activityfilter.setbounds(globalinfo.scanDatamin, globalinfo.scanDatamax)
//
//      // when we adjust the range slider change the material in the canvas shown
//      range.oninput = () => {
//        // call the filter on the activation data, and pass to create image, this function internally takes into account where the filter min and max interactive divs are positioned
//        activationData = activityfilter.filter()
//        // check for categorical filters, step through the list of the filter holder and apply the filter functions of each to the activation data
//        categoricalFilters.filtersList.map(catfilter => {
//          activationData = catfilter.filter(activationData)
//        })
//
//
//        // determine which radio button is currently pressed
//        getRadioSelected()
//
//
//
//        // now determine which slice we are supposed to draw the boundaries of provided the selected brain view an the slice index
//        let ind = parseInt(range.value)
//        let name = rangeData.slices[selected][ind]
//        label.innerHTML = rangeData.measurements[selected][range.value]
//
//        // draw the actual data on the canvas given the activation data and the slice to index the sliceData set of region boundaries
//        sliceSelection.createImage(name, drawing, activationData)
//      }
//      // add events to the filter attached so it redraws canvas also
//      //
//    }
//    return ob
//  }
//
//  // this is a filter that can work on other columns
//
//  let sepColumnFilter = (holder) => {
//    let ob = {}
//    ob.create = () => {
//      // borrow the column selector and create another one here
//      // have an operations bar for = or != bool on the string data
//      // and > < for the data that is numeric or parsable
//      // ?? did we decide that there was going to be anything like 
//    }
//    return ob
//  }
//
//
//  let makediv = (width, holder) => {
//    let ob = {}
//    ob.additionalLimit = (v) => {
//      return undefined
//    }
//    ob.create = () => {
//      let d = document.createElement("div")
//      ob.element = d
//      d.style.height = "30px"
//      d.style.width = "30px"
//      d.style.position = "relative"
//      let move = (e) => {
//        let x = e.clientX - holder.getBoundingClientRect().left
//        let left = x
//        if (left > width - 30) { // because the size of the div at the moment is 30
//          left = width - 30
//        }
//        if (left < 0) {
//          left = 0
//        }
//        if (ob.additionalLimit(left)) {
//          console.log("stopped marker")
//        } else {
//          ob.element.style.left = `${left}px`
//        }
//        ob.v = parseInt(ob.element.style.left)
//      }
//      let cancelMove = (e) => {
//        console.log("cancelling")
//        document.removeEventListener("mousemove", move)
//        document.removeEventListener("mouseup", cancelMove)
//      }
//      let click = () => {
//        document.addEventListener("mousemove", move)
//        document.addEventListener("mouseup", cancelMove)
//      }
//      d.addEventListener("mousedown", click)
//      d.style.background = "#00000052"
//    }
//    return ob
//  }
//
//
//
//
//  // the categorical filter option
//  // ?? when should I pass in the data for this??
//  let altColumnFilter = () => {
//    let ob = {}
//    ob.setcoldata = (data) => {
//      ob.coldata = data
//    }
//    // create filter option for categorical
//    //    find unique ids in column
//    //    add selection element that has the unique ids and then a == or != thing
//    ob.createCategorical = (colData) => {
//      let uniqueSet = []
//      for (let element of colData) {
//        if (uniqueSet.indexOf(element) == -1) {
//          uniqueSet.push(element)
//        }
//      }
//      // create a select and drop down with the options
//      ob.catSelect = document.createElement("select")
//      for (let op of uniqueSet) {
//        let option = document.createElement("option")
//        ob.catSelect.append(option)
//        option.value = op
//        option.innerHTML = op
//      }
//      // include the == and != buttons
//      ob.operation = document.createElement("select")
//      let equals = document.createElement("option")
//      equals.innerHTML = "=="
//      equals.value = "=="
//      let notEquals = document.createElement("option")
//      notEquals.innerHTML = "!="
//      notEquals.value = "!="
//      ob.operation.append(equals)
//      ob.operation.append(notEquals)
//      ob.holder.append(ob.operation)
//      ob.holder.append(ob.catSelect)
//      // add event triggered on catSelect that updates what values the filter reduce uses
//      // return a boolean array 0 1s to pair with the final filter call
//      let mask = () => {
//        ob.boolMask = colData.map(e => {
//          if (ob.operation.value == "==") {
//            if (e == ob.catSelect.value) {
//              return 1
//            }
//            return 0
//          }
//          if (ob.operation.value == "!=") {
//            if (e != ob.catSelect.value) {
//              return 1
//            }
//            return 0
//          }
//        })
//      }
//      mask()
//      ob.operation.onchange = mask
//      ob.catSelect.onchange = mask
//    }
//    ob.filter = (activityData) => {
//      // apply the boolmask to the data and zero/NaN out the elements that don't fit the cat
//      return activityData.map((e, i) => {
//        if (ob.boolMask[i]) {
//          return e
//        }
//        return NaN
//      })
//    }
//
//    ob.createNumerical = (colData) => {
//      // create the range sliders
//
//    }
//
//    // create filter options for numerical
//    //    add range sliders
//
//    // call filter and return the data
//    ob.create = (holder, data) => {
//      // select bar createdadd options to it attach a selection changed event to it
//      ob.holder = holder
//      ob.colSelect = document.createElement("select")
//      ob.colSelect.onchange = () => {
//        // delete the previous items
//        if (ob.operation) {
//          ob.operation.remove()
//          ob.catSelect.remove()
//        }
//        ob.columnData = data.data[ob.colSelect.value]
//        // hope its longer than 1 element
//        if (isNaN(parseFloat(ob.columnData[0]))) {
//          // do the categorical 
//          ob.createCategorical(ob.columnData)
//        } else {
//          // setup for numerical
//          ob.createNumerical(ob.columnData)
//        }
//      }
//      // put the options in to the select
//      for (let key of Object.keys(data.data)) {
//        let option = document.createElement("option")
//        option.value = key
//        option.innerHTML = key
//        ob.colSelect.append(option)
//      }
//      holder.append(ob.colSelect)
//    }
//    return ob
//  }
//
//  //  there will be one filter categorical for each pane, and within it there will be options to create a 
//  //
//

window.onload = async () => {
  let app = new Application()
  await app.addButton()
}