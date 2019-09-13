import geodata from "./gz_2010_us_040_00_500k.json"
import sliceData from "./GeoJson_Brains/total.json"
import csvData from "./WeaveTutorial/Tables/indiv_run_summary_pos_thresh_ice_perc_sum.csv"
let pane = (number)=> {
  let ob = {}
  ob.create = ()=> {
    // want radio w 3 buttons, range slider, selection form for loading
    let div = document.createElement("div")
    div.setAttribute("id",`paneholder${number}`)
    div.style.setProperty("background","aliceblue")
    let range = document.createElement("input")
    range.type="range"
    div.append(range)
    let sliceSelection = sliceSelect(div)
    sliceSelection.createtag()
    let rangeData = rangePrep()
    // make the range slider tied to slice lookup
    // start with sagittal
    range.min= 0
    range.max = rangeData.axial.length-1
    range.step = 1
    range.onchange = ()=> {
      let ind = parseInt(range.value)
      let name = rangeData["sagittal"][ind]
      sliceSelection.createImage(name)

    }
    document.body.append(div)
  }
  // setup a div with a canvas inside of it
  return ob
}

let addButton = ()=> {
  let ob = {}
  ob.count = 0
  ob.create = ()=> {
    let btn = document.createElement("button")
    btn.onclick = ()=> {
      // create a pane
      let first = pane()
      console.log("adding pane")
      first.create(ob.count)
      ob.count+=1
    }
    btn.setAttribute("id","addbtn")
    btn.innerHTML = "Add Pane"
    document.body.append(btn)

  }
  return ob
}


let btn1 = addButton()
btn1.create()

let brain
let globalinfo
let pointValues ={}// this is region data that ideally has no gaps between points to make the cursor detection more reliable
let parametricInterp = () => {
  let ob = {}
  ob.setupRun = (x0,y0,x1,y1,step) => {
    let xys = []
    for (let t = 0;t < 1;t+= step) {
      xys.push(ob.calct(x0,y0,x1,y1,t))
    }
    return xys
  }
  ob.calct = (x0,y0,x1,y1,t) => {
    return [x0 + (x1 - x0)*t,y0 + (y1 - y0)*t]
  }
  return ob 
}
let interpolator = () => {
  let ob = {}
  ob.setup = (x0,y0,x1,y1) => {
    ob.x0 = x0
    ob.y0 = y0
    ob.x1 = x1
    ob.y1 = y1
  }
  ob.calc = (x) => {
    return (ob.y1-ob.y0)/(ob.x1 -ob.x0)*x + (ob.x1*ob.y0 - ob.y1 * ob.x0)/(ob.x1 - ob.x0)
  }
  return ob
}

let LerpCol = (c1,c2,t) => {
  let red = c1.r + ( c2.r - c1.r) *t
  let blue = c1.b + ( c2.b - c1.b) *t
  let green = c1.g + ( c2.g - c1.g) *t
  return `rgb(${red},${green},${blue})`

}

let globals = (scanCol)=> {
  // scanCol is the column that has the data we care about putting in the color fill
  // this returns a summary object that knows things about the size of the brain json dimensions and also the min and max of hte scan data
  let ob ={}
  let globals = [1000,1000,-1000,-1000]
  for (let feature of brain.features) {
    for (let line of feature.geometry.coordinates) {
      for (let pt of line) {
        if (pt[0] < globals[0]) {
          globals[0] = pt[0]
        }
        if( pt[1] < globals[1] ){
          globals[1] = pt[1]
        }
        if (pt[0] > globals[2]) {
          globals[2] = pt[0]
        }
        if( pt[1] > globals[3]) {
          globals[3] = pt[1]
        }
      }
    }
  }
  ob.globals = globals
  ob.ratio = globals[3]/globals[2]
  ob.scanDatamin =0
  ob.scanDatamax =0
  for (let row of csvData ) {
    if (row[scanCol] > ob.scanDatamax) {
      ob.scanDatamax = parseFloat(row[scanCol])
    }
    if (row[scanCol] < ob.scanDatamin) {
      ob.scanDatamin = parseFloat(row[scanCol])
    }
  }
  // this normalizes the value from the scan data into the range 0 to 1 for color interpolation

  let scanScalar =interpolator()
  scanScalar.setup(ob.scanDatamin,0,ob.scanDatamax,1)
  ob.scanScalar = scanScalar
  // calculate the min and maxes of the scan data for each scan
  return ob
}

let drawLine = (linedata,ctx)=> {
  //linedata  = {points,region}
  let ob = {}

  // need canvas ref
  //create interpolator
  //map xmin - xmax to 0 to 5000 or whatever width is do the same for y
  let xinterp = interpolator()
  xinterp.setup(globalinfo.globals[0],0+10,globalinfo.globals[2],500+10)
  let yinterp = interpolator()
  yinterp.setup(globalinfo.globals[1],(500+10)*globalinfo.ratio,globalinfo.globals[3],10)// extra 10is the margin split intwo
  //TODO find better version of how to structure so that the margin can be programmatically set
  ob.draw =() => {
    ctx.beginPath()
    let red = {
      r:255,
      g:0,
      b:0,
    }
    let yellow = {
      r:255,
      g:255,
      b:255
    }
    let first = linedata.points[0]
    let x = xinterp.calc(first[0])
    let y = yinterp.calc(first[1])
    let last = [x,y]
    // create gaplessEntry
    pointValues[linedata.region] =[[x,y]]
    ctx.moveTo(x,y)
    for (let i = 1; i < linedata.points.length;i++) {
      let pt = linedata.points[i]
      let x = xinterp.calc(pt[0])
      let y = yinterp.calc(pt[1])
      // do parametric interpolation of points between last x,y and the present one
      //
      pointValues[linedata.region].push([x,y])
      ctx.lineTo(x,y)
      // update the data
    }
    ctx.closePath()
    ctx.stroke()
    for (let row of csvData) {
      // the important parts of the dataset are in column 0 and column 9
      if ( linedata.region == row[0] ) {
        // the min appears to be almost 0 and the max should come in around 0.006
        let scanData = parseFloat(row[12])
        if (! isNaN(scanData)) {
          let  t = globalinfo.scanScalar.calc(scanData)
          console.log(t)
          let lerpc = LerpCol(yellow,red,t)
          ctx.fillStyle=lerpc
          ctx.fill()
        }

        break
      }
    }
  }
  return ob
}

let setup = (lwidth,paneHolder) => {
  let ob = {}
  ob.begin = (height,width,margin) => {
    let can = document.createElement("canvas")
    paneHolder.append(can)
    ob.can = can
    can.height = height + margin
    can.width = width + margin
    ob.ctx = can.getContext("2d")
    ob.ctx.lineWidth= lwidth
  }
  return ob
}

let dataBind = (drawing,data_to_bind) => {
  // drawing has can and ctx attributes
  // find a way get to the data we need here
  let iter = 0  
  console.log("number of total coordinates ",data_to_bind.geometry.coordinates.length)
  for (line of data_to_bind.geometry.coordinates) {
    //let data_bound = {coords:line,properties
    //make copy of line data and bind in the region name
    let drawingData = {
      points:line,
      region:data_to_bind.properties.regionName
    }
    console.log(data_to_bind.properties)
    let line = drawLine(drawingData,drawing.ctx)
    line.draw()
    iter +=1
  }
}

let featurePass = (drawing,upperData) => {
  let ob = {}
  ob.mapFeatures = () => {
    console.log("total features ",upperData.features.length)
  for (let feature of upperData.features) {
    let db = dataBind(drawing,feature)
  }
  }
  return ob
}


// lifted from stack overflow

//for each state have something which goes through the 
//  coordinates is an array of 
//
// aim for as much functional as possible

let pointInPoly = (x,y,epsilon,drawing) => {
  let ob = {}
  // interpolate
  ob.checkinside = (regionData) => {
    // this compares a current region to the existing x,y
    // calculate the line from the far left to the point
    // probably need an epsilon for the comparison between horizontal and region points because they might not always equal
    // in each region just count the values that are close to that y value, and then print them plus the x, y
    let hits = [] 
    // interpolate, but 
    let within = false
    for (let i = 0; i < regionData.length-1;i++) {
      // perform step interpolation 
      let subdata = parametricInterp()
      let xprev = regionData[i][0]
      let yprev = regionData[i][1]
      let xnext = regionData[i+1][0]
      let ynext = regionData[i+1][1]
      for (let pt of subdata.setupRun(xprev,yprev,xnext,ynext,.1)) {
        if (Math.abs(y - pt[1]) < epsilon && x > pt[0]) {
          hits.push(pt)
          console.log(y,Math.abs(y - pt[1]), x, pt[0])
          within = ! within
        }
      }
    }
    if (within) {
      console.log(hits)
    }
    // now go through the hits and only take the ones that are less than the x
    return within
  }
  ob.iterRegions = () => {
    // the regions data is technically the brain.features, so we iter over the regionss in the same way as drawing them
    for (let region in pointValues ) {
      // now geometry and coordinates, check for within is true, and end there if so
      // changing the datatype getting used
      let rdat = pointValues[region]
      let within = ob.checkinside(rdat)
      console.log("investigating ",region)
      if (within) {
        console.log("yes")
        // create a little info blob at the cursor on the canvas with the region data and the activation amounts
        break
      }
    }
  }
  return ob
}

let rangePrep = ()=> {
  // we will create and sort 3 element array of the data
  let slicesByView = {
    "sagittal":[],
    "axial":[],
    "coronal":[]
  }
  for (let n in sliceData) {
    if (n.search(/cor/) == 0) {
      slicesByView["sagittal"].push(n)
    }
    if (n.search(/sag/) == 0) {
      slicesByView["axial"].push(n)
    }
    if (n.search(/ax/) == 0) {

      slicesByView["coronal"].push(n)
    }
  }
  let sortfunc = (x,y) => {
    let xmm = parseInt(x.match(/(-?\d+)(mm)?.json/)[1])
    let ymm = parseInt(y.match(/(-?\d+)(mm)?.json/)[1])
    return xmm - ymm
  }
  slicesByView.axial.sort(sortfunc)
  slicesByView.sagittal.sort(sortfunc)
  slicesByView.coronal.sort(sortfunc)
  return slicesByView
}

let sliceSelect = (paneHolder) => {
  let ob = {}
  ob.createtag = ()=> {
    let s = document.createElement("select")
    paneHolder.append(s)
  }
  ob.createImage = (slice) =>  {
    brain = sliceData[slice]
    globalinfo = globals(9)
    // data height vs width ration
    let drawing = setup(3,paneHolder)
    console.log(brain)
    drawing.begin(500*globalinfo.ratio,500,20)
    let allfeatures = featurePass(drawing,brain)
    allfeatures.mapFeatures()
    console.log(globals)
    console.log(Math.floor(Math.random()*255))
    let getPos = (can,e) => {
      let rect = can.getBoundingClientRect()
      let x = e.clientX - rect.left
      let y = e.clientY - rect.top
      console.log("x: ",x, "y: ", y)
      // activate the border point-in-polygon algorithm
      let pip = pointInPoly(x,y,.05,drawing)
      pip.iterRegions()
    }

    drawing.can.addEventListener("click",(e)=> {
      getPos(drawing.can,e)
    })

  }
  return ob
}


