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
      this.can = new Canvas(newPane.paneDiv,this.ctrlop.data)
      this.can.init()
      // target the canvas with our events
      this.ctrlop.target(this.can.can)
      this.ctrlop.setDataShareCallbacks(this.can.storeColumnData(),this.can.storeRegionData())

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
    this.eTarget = undefined
  }
  target(ele) {
    this.eTarget = ele
  }
  // these functions will get called in the event listeners and allow the canvas to have the correct data 
  setDataShareCallbacks(storeValCol,storeSlice){
    this.storeValCol = storeValCol
    this.storeSlice = storeSlice
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
      let e = new Event("radiobuttonchanged")
      if (this.eTarget) {
        let slice = this.regionBoundaryData[this.sliderSlices[this.radioSelected][this.slider.value]]
        this.storeSlice(slice)
        this.eTarget.dispatchEvent(e)
      }
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

      // establish filters for the selected column of data
      this.createFilters()

      // trigger a valcolchange event
      // this will make the filters update themselves, and make the canvas redraw the 
      let e = new Event("valcolchange")
      // update the canvas columdata somehow
      if (this.eTarget) {
        // send it to the canvas
        this.storeValCol(this.coldata)
        // if we are already using this call back should we just draw call too?
        this.eTarget.dispatchEvent(e)
      }
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
      let xmm = parseInt(x.match(/(-?\d+\.?\d*?)(mm)?/)[1])
      let ymm = parseInt(y.match(/(-?\d+\.?\d*?)(mm)?/)[1])
      return xmm - ymm
    }
    slicesByView.axial.sort(sortfunc)
    slicesByView.sagittal.sort(sortfunc)
    slicesByView.coronal.sort(sortfunc)
    this.sliderSlices = slicesByView
    // get the array of values
    this.sliderMeasurements = {}
    this.sliderMeasurements.axial = slicesByView.axial.map(sl => {
      return (sl.match(/(-?\d+\.?\d*?mm)/)[1])
    })
    this.sliderMeasurements.sagittal = slicesByView.sagittal.map(sl => {
      return (sl.match(/(-?\d+\.?\d*?mm)/)[1])
    })
    this.sliderMeasurements.coronal = slicesByView.coronal.map(sl => {
      return (sl.match(/(-?\d+\.?\d*?mm)/)[1])
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
      let name = this.sliderSlices[this.radioSelected][ind]
      this.sliderlabel.innerHTML = this.sliderMeasurements[this.radioSelected][ind]
      // provide the name of the slice to the canvas drawing machinery
      // ....
      let e = new Event("sliderchange")
      if (this.eTarget) {
        let slice = this.regionBoundaryData[this.sliderSlices[this.radioSelected][this.slider.value]]
        this.storeSlice(slice)
        this.eTarget.dispatchEvent(e)
      }
    }
  }
  // prepare the filters
  createFilters() {
    if (this.activityFilter) {
      this.activityFilter.remove()
    }
    this.activityFilter = new ActivityFilter(this.ctrlDiv, this.coldata)
    this.activityFilter.init()
    // set them at default values

  }

  other() {
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
  //remove the previous filter elements
  remove() {
    this.minlabel.remove()
    this.maxlabel.remove()
    this.maxel.element.remove()
    this.minel.element.remove()
  }
  init() {
    // make a range slider that updates the self filter function which is called later on activity data
    let rangeWidth = this.ctrlDiv.getBoundingClientRect()
    let min = new divMaker(rangeWidth.width / 4, this.ctrlDiv)
    let max = new divMaker(rangeWidth.width / 4, this.ctrlDiv)

    // establish the absmin and absmax of the column data
    // raise hell if the data can't be sorted this way
    this.setbounds(Math.min(...this.data), Math.max(...this.data))

    this.maxel = max
    this.minel = min
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
      // right now there is no etarget because this is a makediv not a ctrlop
      let filterEvent = new Event("activityfilterchange")
      if (this.eTarget) {
        this.eTarget.dispatchEvent(filterEvent)
      }
    }
    let click = () => {
      document.addEventListener("mousemove", move)
      document.addEventListener("mouseup", cancelMove)
    }
    d.addEventListener("mousedown", click)
    d.style.background = "#00000052"
  }
  // this function is replaced in the instances of the object, class inheritance case
  additionalLimit(v) {
    return undefined
  }
}


class Canvas {
  // holds stuff like the global min/max, the invisible and visible canvases, the boundary lines, and various interpolators
  // use the ctrlInstance to get things like boundary data, and fill data when the values change
  constructor(paneDiv,csvData) {
    this.can = document.createElement("canvas")
    // the invisible canvas is used to assist with the mapping of clicks to uniquely colored regions whose pixels can be queried for color strings mapping to region names
    // easy hack to keep performance and accuracy of interactivity on canvas
    this.invisican = document.createElement("canvas")
    this.invisican.id = "invisican"
    this.innerHolder = document.createElement("div")
    this.innerHolder.className = "innerholder"
    // other versions of teh data will be around later,
    // get data for boundaries and selected value column
    this.paneDiv = paneDiv
    this.csvData= csvData
  }
  // capture the this value, and let teh callback modify the canvas property coldata
  storeColumnData(){
    return (coldata) => {this.coldata = coldata}
  }
  storeRegionData() {
    return (sliceData) => {this.sliceData = sliceData}
  }
  makeRegDataMap() {
    this.regNameToValueMap = {}
    this.csvData["regionName"].map((e, i) => {
      this.regNameToValueMap[e.replace(/\s/,"")] = this.coldata[i]
    })
  }
  init() {
    // setup the canvas
    this.innerHolder.append(this.can)
    this.innerHolder.append(this.invisican)
    this.paneDiv.append(this.innerHolder)
    this.can.height = 1500
    this.can.width=1500
    this.invisican.height = 1500
    this.invisican.width=1500
    //create interpolators for drawing
    //map xmin - xmax to 0 to 5000 or whatever width is do the same for y
    // create the regnametoValueMap
    this.ctx = this.can.getContext("2d")
    this.invisictx = this.invisican.getContext("2d")
    // take care of binding various functions to the events that get emitted
    // events to track valcolchange,radiobuttonchanged,sliderchange, activityfilterchange
    // valcolchange we need to wait until something happens with the sliders?

    //radiobutton and slider change have implications for the slice we are looking at
    this.can.addEventListener("radiobuttonchanged", () => {
      this.setupCanvas()
      this.drawCanvas()
    })
    this.can.addEventListener("sliderchange", () => {
      this.setupCanvas()
      this.drawCanvas()
    })

    //activity filter change, and valcolchange mean we must update our version of the ctrlInstance coldat, requires updating the regNameToValMap also
    this.can.addEventListener("activityfilterchange", () => {
      this.setupCanvas()
      this.drawCanvas()
    })

  }
  // this is meant to query the ctrlInstance for what view and slice index we are on
  setupCanvas() {
    // will update the map used in the draw to determine the color of a region
    this.makeRegDataMap()
    this.can.addEventListener("click", this.getPos.bind(this))
    // initialize the color setting for the invisican
    let cc = color_collection(this.sliceData.features.length)
    this.colToRegMap = {}
    this.regToColMap = {}
    this.sliceData.features.map((f, i) => {
      // this is for the fill on the invisible canvas
      this.regToColMap[f.properties.regionName] = cc.array[i]
      this.colToRegMap[JSON.stringify(cc.array[i])] = f.properties.regionName
    })
    this.calcRegionSizeGlobal()
    this.calcValueColMinMax()
    // create the region data to screen space interpolators
    let xinterp = interpolator()
    xinterp.setup(this.regionSizes[0], 0 + 10, this.regionSizes[2], 500 + 10)
    this.xinterp = xinterp
    let yinterp = interpolator()
    yinterp.setup(this.regionSizes[1], (500 + 10) * this.canvasRatio, this.regionSizes[3], 10)// extra 10is the margin split intwo
    this.yinterp = yinterp
  }
  getPos(e) {
    // the drawing holds both canvases, so we can get the x,y from the click, and apply it to the invisible can
    let rect = this.can.getBoundingClientRect()
    let x = e.clientX - rect.left
    let y = e.clientY - rect.top
    let ctx = this.invisictx
    // activate the border point-in-polygon algorithm
    // get image data
    // loop until we move right to get a pix value that is above certain threshold green
    let pix = Array(...ctx.getImageData(x, y, 1, 1).data.slice(0, 3))
    // query the invisible map
    if (colToRegMap[JSON.stringify(pix)] != undefined) {
      // make a little side box with the info in it
      // take away a chunk of the image at that area
      let rightDiv = document.createElement("div")
      rightDiv.id = "tooltip"
      rightDiv.innerHTML = `
            <h3>Selected Region
              <p class="tooltip-child">
                    ${ colToRegMap[JSON.stringify(pix)]}
              </p>
              <p class="tooltip-child">
            activity value: hey this is missing!
              </p>
            </h3>
            `
      //append to canvas element if possible
      this.innerHolder.append(rightDiv)
    }
  }
  resize(height, width, margin) {
    this.can.height = height + margin
    this.can.width = width + margin
    this.invisican.height = height + margin
    this.invisican.width = width + margin
    this.ctx.lineWidth = lwidth
    this.invisictx.lineWidth = lwidth
  }
  // figure out how much actual space the brain region data takes up, this only needs to get figured out once per pane creation
  calcRegionSizeGlobal() {
    // scanCol is the column that has the data we care about putting in the color fill
    // this returns a summary object that knows things about the size of the brain json dimensions and also the min and max of hte scan data
    //!! should only do this part once
    let globals = [1000, 1000, -1000, -1000]
    for (let feature of this.sliceData.features) {
      // likely nota  loop because coordinates is a single element array
      for (let line of feature.geometry.coordinates) {
        for (let pt of line) {
          if (pt[0] < globals[0]) {
            globals[0] = pt[0]
          }
          if (pt[1] < globals[1]) {
            globals[1] = pt[1]
          }
          if (pt[0] > globals[2]) {
            globals[2] = pt[0]
          }
          if (pt[1] > globals[3]) {
            globals[3] = pt[1]
          }
        }
      }
    }
    this.regionSizes = globals
    this.canvasRatio = globals[3] / globals[2]
  }
  // calculate the min and max of the column provided to the canvas class
  calcValueColMinMax() {
    this.scanDatamin = 0
    this.scanDatamax = 0
    for (let row of this.coldata) {
      if (row > this.scanDatamax) {
        this.scanDatamax = parseFloat(row)
      }
      if (row < this.scanDatamin) {
        this.scanDatamin = parseFloat(row)
      }
    }
    // this normalizes the value from the scan data into the range 0 to 1 for color interpolation
    let valToColInterp = interpolator()
    valToColInterp.setup(this.scanDatamin, 0, this.scanDatamax, 1)
    this.valToColInterp = valToColInterp
    // calculate the min and maxes of the scan data for each scan
  }

  drawCanvas() {
    //TODO find better version of how to structure so that the margin can be programmatically set
    this.ctx.clearRect(0,0,this.can.width,this.can.height)
    this.ctx.beginPath()
    this.invisictx.beginPath()
    let red = {
      r: 255,
      g: 0,
      b: 0,
    }
    let yellow = {
      r: 128,
      g: 128,
      b: 128
    }
    // iterate over the boundary data
    for (let region of this.sliceData.features) {
      // this is the object that has features, and properties
      for (let coords of region.geometry.coordinates) {

        // create simplified variable with points and region name
        let linedata = { points: coords, region: region.properties.regionName }

        // begin actual drawing to the canvas
        let first = linedata.points[0]
        let x = this.xinterp.calc(first[0])
        let y = this.yinterp.calc(first[1])
        this.ctx.moveTo(x, y)
        this.invisictx.moveTo(x, y)
        for (let i = 1; i < linedata.points.length; i++) {
          let pt = linedata.points[i]
          let x = this.xinterp.calc(pt[0])
          let y = this.yinterp.calc(pt[1])
          this.ctx.lineTo(x, y)
          this.invisictx.lineTo(x, y)
        }
        this.ctx.closePath()
        this.invisictx.closePath()
        // these aren't defined yet
        if (this.regNameToValueMap != undefined) {
          if (this.regNameToValueMap[linedata.region]) {
            let scanData = this.regNameToValueMap[linedata.region]
            let t = this.valToColInterp.calc(scanData)
            let lerpc = LerpCol(yellow, red, t, 2)
            this.ctx.fillStyle = lerpc
            this.ctx.fill()
            // query the region to color map
          }
        } else {
          // leave the section gray
          this.ctx.fillStyle = "gray";
          this.ctx.fill();
        }
        // color on the invisible canvas, this happens regardless of activity
        this.invisictx.fillStyle = `rgb(${this.regToColMap[linedata.region][0]},${this.regToColMap[linedata.region][1]},${this.regToColMap[linedata.region][2]})`
        this.invisictx.fill()
      }
    }
  }
}

// non full blown classes
let color_collection = (rnum) => {
  ob = {}
  // this is the number of color chunks for each of the rgb channels
  let colordim = Math.ceil(Math.pow(rnum, 1 / 3))
  console.log(colordim, "is the cube of ", rnum)
  ob.array = []
  // nesting 3 deep, but each should be short
  for (let r = 0; r < colordim; r++) {
    for (let g = 0; g < colordim; g++) {
      for (let b = 0; b < colordim; b++) {
        let base = 255 / colordim // the base is permuted by each of the rgb loop variables
        // must round because the canvas sampling by pixel doesn't return floats
        ob.array.push([Math.round(base * r), Math.round(base * g), Math.round(base * b)])
      }
    }
  }
  return ob
}

let parametricInterp = () => {
  let ob = {}
  ob.setupRun = (x0, y0, x1, y1, step) => {
    let xys = []
    for (let t = 0; t < 1; t += step) {
      xys.push(ob.calct(x0, y0, x1, y1, t))
    }
    return xys
  }
  ob.calct = (x0, y0, x1, y1, t) => {
    return [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t]
  }
  return ob
}
let interpolator = () => {
  let ob = {}
  ob.setup = (x0, y0, x1, y1) => {
    ob.x0 = x0
    ob.y0 = y0
    ob.x1 = x1
    ob.y1 = y1
  }
  ob.calc = (x) => {
    return (ob.y1 - ob.y0) / (ob.x1 - ob.x0) * x + (ob.x1 * ob.y0 - ob.y1 * ob.x0) / (ob.x1 - ob.x0)
  }
  return ob
}

let LerpCol = (c1, c2, t, jitter) => {
  let red = Math.round(c1.r + (c2.r - c1.r) * t + Math.random() * jitter)
  if (red > 255) {
    red = 255
  }
  let blue = Math.round(c1.b + (c2.b - c1.b) * t + Math.random() * jitter)
  if (blue > 255) {
    blue = 255
  }
  let green = Math.round(c1.g + (c2.g - c1.g) * t + Math.random() * jitter)
  if (green > 255) {
    green = 255
  }
  return `rgb(${red},${green},${blue})`

}

window.onload = async () => {
  let app = new Application()
  await app.addButton()
}