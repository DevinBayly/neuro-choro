
let brain
let globalinfo
let csvData = {}// organized by pane count ids
let csvRegionArray
let sliceData
let regionMap = {}  


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

let globals = (activationData)=> {
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
  for (let row of activationData ) {
    if (row > ob.scanDatamax) {
      ob.scanDatamax = parseFloat(row)
    }
    if (row < ob.scanDatamin) {
      ob.scanDatamin = parseFloat(row)
    }
  }
  // this normalizes the value from the scan data into the range 0 to 1 for color interpolation
  let scanScalar =interpolator()
  scanScalar.setup(ob.scanDatamin,0,ob.scanDatamax,1)
  ob.scanScalar = scanScalar
  // calculate the min and maxes of the scan data for each scan
  return ob
}

let drawLine = (linedata,ctx,activationData)=> {
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
    let xbounds = {min:x,max:x}
    let ybounds = {min:y,max:y}
    let last = [x,y]
    // create gaplessEntry
    pointValues[linedata.region] =[[x,y]]
    ctx.moveTo(x,y)
    for (let i = 1; i < linedata.points.length;i++) {
      let pt = linedata.points[i]
      let x = xinterp.calc(pt[0])
      let y = yinterp.calc(pt[1])
      if (xbounds.min > x) {
        xbounds.min = x
      }
      if (xbounds.max < x) {
        xbounds.max = x
      }
      if (ybounds.max < y) {
        ybounds.max = y
      }
      if (ybounds.min > y) {
        ybounds.min = y
      }
      // do parametric interpolation of points between last x,y and the present one
      //
      pointValues[linedata.region].push([x,y])
      ctx.lineTo(x,y)
      // update the data
    }
    ctx.closePath()
    let fillString = `rgb(0,${Math.round(Math.random()*255)},${Math.round(Math.random()*255)})`
    regionMap[fillString] = {name:linedata.region}
    for (let i =0; i < activationData.length; i++) {
      let activationValue = activationData[i]
      // check to see if the data we have belongs in this region
      if ( linedata.region == csvRegionArray[i]) {
        // the min appears to be almost 0 and the max should come in around 0.006
        let scanData = parseFloat(activationValue)
        // add the float value to the region map
        regionMap[fillString].activation = scanData
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
    ctx.fillStyle = fillString
    ctx.fillRect((xbounds.min + xbounds.max)/2,(ybounds.min+ ybounds.max)/2,10,10)
    ctx.stroke()
  }
  return ob
}

let setup = (lwidth,paneHolder) => {
  let ob = {}
  ob.outerHolder = paneHolder
  ob.begin = () => {
    let can = document.createElement("canvas")
    ob.innerHolder = document.createElement("div")
    ob.innerHolder.className = "innerholder"
    ob.innerHolder.append(can)
    paneHolder.append(ob.innerHolder)
    ob.can = can
    ob.ctx = can.getContext("2d")
  }
  ob.resize =(height,width,margin) => {
    ob.can.height = height + margin
    ob.can.width = width + margin
    ob.ctx.lineWidth= lwidth
  }
  return ob
}

let dataBind = (drawing,data_to_bind,activationData) => {
  // drawing has can and ctx attributes
  // find a way get to the data we need here
  let iter = 0  
  console.log("number of total coordinates ",data_to_bind.geometry.coordinates.length)
  for (let pline of data_to_bind.geometry.coordinates) {
    //let data_bound = {coords:line,properties
    //make copy of line data and bind in the region name
    let drawingData = {
      points:pline,
      region:data_to_bind.properties.regionName
    }
    console.log(data_to_bind.properties)
    let line = drawLine(drawingData,drawing.ctx,activationData)
    line.draw()
    iter +=1
  }
}

let featurePass = (drawing,upperData,activationData) => {
  let ob = {}
  ob.mapFeatures = () => {
    console.log("total features ",upperData.features.length)
  for (let feature of upperData.features) {
    let db = dataBind(drawing,feature,activationData)
  }
  }
  return ob
}


// lifted from stack overflow

//for each state have something which goes through the 
//  coordinates is an array of 
//
// aim for as much functional as possible
let rangePrep = ()=> {
  // we will create and sort 3 element array of the data
  let ob = {}
  let slicesByView = {
    "sagittal":[],
    "axial":[],
    "coronal":[]
  }
  for (let n in sliceData) {
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
  let sortfunc = (x,y) => {
    let xmm = parseInt(x.match(/(-?\d+)(mm)?.json/)[1])
    let ymm = parseInt(y.match(/(-?\d+)(mm)?.json/)[1])
    return xmm - ymm
  }
  slicesByView.axial.sort(sortfunc)
  slicesByView.sagittal.sort(sortfunc)
  slicesByView.coronal.sort(sortfunc)
  ob.slices = slicesByView
  // get the array of values
  ob.measurements = {}
  ob.measurements.axial =slicesByView.axial.map(sl => {
    return (sl.match(/(-?\d+mm)?.json/)[1])
  })
  ob.measurements.sagittal =slicesByView.sagittal.map(sl => {
    return (sl.match(/(-?\d+mm)?.json/)[1])
  })
  ob.measurements.coronal =slicesByView.coronal.map(sl => {
    return (sl.match(/(-?\d+mm)?.json/)[1])
  })
  return ob
}

let sliceSelect = (paneHolder) => {
  let ob = {}
  ob.createImage = (slice,drawing,activationData) =>  {
    drawing.ctx.clearRect(0,0,drawing.can.height,drawing.can.width)
    brain = sliceData[slice]
    globalinfo = globals(activationData)
    drawing.resize(500*globalinfo.ratio,500,20)
    // data height vs width ration
    console.log(brain)
    let allfeatures = featurePass(drawing,brain,activationData)
    allfeatures.mapFeatures()
    console.log(globalinfo)
    console.log(Math.floor(Math.random()*255))
    let getPos = (can,e) => {
      let rect = can.getBoundingClientRect()
      let x = e.clientX - rect.left
      let y = e.clientY - rect.top
      console.log("x: ",x, "y: ", y)
      let ctx = can.getContext("2d")
      // activate the border point-in-polygon algorithm
      // get image data
      let pix = ctx.getImageData(x,y,1,1).data
      console.log(pix)
      let colorString = `rgb(0,${pix[1]},${pix[2]})`
      console.log(regionMap[colorString])
      if (regionMap[colorString] != undefined) {
        // make a little side box with the info in it
        // take away a chunk of the image at that area
        let rightDiv = document.createElement("div")
        rightDiv.id = "tooltip"
        rightDiv.innerHTML = `
<h3>Selected Region
  <p class="tooltip-child">
        ${ regionMap[colorString].name }
  </p>
  <p class="tooltip-child">
activity value: ${regionMap[colorString].activation}
  </p>
</h3>
`
        //append to canvas element if possible
        drawing.innerHolder.append(rightDiv)
        setTimeout(()=>{
          // replace the original pixels
          rightDiv.remove()
        },3500)
      }
    }
    if (drawing.posFunc == undefined) {
      let callGetPos = (e)=> {
        getPos(drawing.can,e)
      }
      drawing.posFunc = callGetPos
      // store function once so that adding and removing is possible
    } else {
      drawing.can.removeEventListener("click",drawing.posFunc)
    }
    drawing.can.addEventListener("click",drawing.posFunc)
  }
  return ob
}



let pane = (number)=> {
  let ob = {}
  ob.create = ()=> {
    // want radio w 3 buttons, range slider, selection form for loading
    let paneDiv = document.createElement("div")
    paneDiv.className = "pane"
    paneDiv.setAttribute("id",`paneholder${number}`)
    let ctrlDiv = document.createElement("div")
    ctrlDiv.className = "ctrlDiv"
    // add a section to the ctrldiv that clicking and dragging will actually move the entire paneholder

    let moverDiv = document.createElement("div")
    let moveIcon = new Image()
    moveIcon.src = "./src/moveicon.svg"
    moveIcon.onload = ()=> {
      // append to the moverDiv
      // resize probably
      moverDiv.append(moveIcon)
    }
    // create the mouse up,down and move events for dragging the panes around
    let mouseMovePane = (e)=> {
      let topVal = e.clientY
      let leftVal = e.clientX
      paneDiv.style.top = `${topVal}px`
      paneDiv.style.left = `${leftVal}px`
    }
    let mouseIsDown = false
    let mouseDown = (e)=> {
      mouseIsDown = true
      // make the holder position absolute
      paneDiv.style.position = "absolute"
      // move to the position that the mouse is at
      let topVal = e.clientY
      let leftVal = e.clientX
      paneDiv.style.top = `${topVal}px`
      paneDiv.style.left = `${leftVal}px`
      // add the move event
      document.body.addEventListener("mousemove",mouseMovePane)
    }
    moverDiv.addEventListener("mousedown",mouseDown)
    let mouseUp = (e)=> {
      // remove the move listener 
      if (mouseIsDown) {
        document.body.removeEventListener("mousemove",mouseMovePane)
      }
    }
    document.body.addEventListener("mouseup",mouseUp)
    moverDiv.className = "panemover"
    ctrlDiv.append(moverDiv)
    paneDiv.append(ctrlDiv)
    let mkradio = (view,radionum) => {
      let rad = document.createElement("input")
      rad.type = "radio"
      rad.id = "radio"+view
      rad.name = "view"+radionum
      rad.value = view
      let label = document.createElement("label") 
      label.setAttribute("for",rad.id)
      label.innerHTML = view
      let div = document.createElement("div")
      div.className = "radcontainer"
      div.id = "radcontainer"+view
      div.append(rad)
      div.append(label)
      ctrlDiv.append(div)
    }
    // setup the radio buttons
    mkradio("axial",number)
    mkradio("sagittal",number)
    mkradio("coronal",number)
    // setup file loader field
    let csvloader = loader(ctrlDiv,paneDiv,number)
    csvloader.create()

    document.body.append(paneDiv)
  }
  // setup a div with a canvas inside of it
  return ob
}

let createCanvasDrawing = (ctrlDiv,canvasHolder,activationData,activityfilter)=>{
  let ob = {}
  ob.run =()=> {

    let sliceSelection = sliceSelect(canvasHolder)
    //delete previous range slider 
    let range = document.createElement("input")
    range.id = "rangeslider"
    let label = document.createElement("label")
    label.id = "rangesliderlabel"
    range.name = "slicerange"
    range.type="range"
    label.setAttribute("for","slicerange")
    ctrlDiv.append(range)
    ctrlDiv.append(label)
    // check for existing canvas, delete if found
    let prevCan = canvasHolder.querySelector("canvas")
    if (prevCan) {
      prevCan.remove()
    }
    let drawing = setup(3,canvasHolder)
    drawing.begin()
    // only run slice selection when we have data 
    let rangeData = rangePrep()
    range.value = 20
    // make the range slider tied to slice lookup
    // start with sagittal
    let selected = "sagittal"
    let getRadioSelected = ()=> {
      if (canvasHolder.querySelector("#radiosagittal").checked) {
        selected = "sagittal"
      }
      if (canvasHolder.querySelector("#radiocoronal").checked) {
        selected = "coronal"
      }
      if (canvasHolder.querySelector("#radioaxial").checked) {
        selected = "axial"

      }
    }
    canvasHolder.querySelector("#radiosagittal").checked = true
    label.innerHTML = rangeData.measurements[selected][range.value]
    sliceSelection.createImage(rangeData.slices[selected][5],drawing,activationData)
    // set these for first time
    activityfilter.max = globalinfo.scanDatamax
    activityfilter.min = globalinfo.scanDatamin
    // update filter bars
    activityfilter.update()
    range.oninput = ()=> {
      // call the filter on the activation data, and pass to create image
        // set max and min to global min max
      activationData = activityfilter.filter()
      getRadioSelected()
      let ind = parseInt(range.value)
      let name = rangeData.slices[selected][ind]
      label.innerHTML = rangeData.measurements[selected][range.value]
      range.min= 0
      range.max = rangeData.slices[selected].length-1
      range.step = 1
      sliceSelection.createImage(name,drawing,activationData)
    }
    // add events to the filter attached so it redraws canvas also
    //
    activityfilter.maxele.oninput = ()=> {
      // update the max and max
      activityfilter.max = activityfilter.maxele.valueAsNumber
      // ensure that themin's max gets updated
      activityfilter.minele.setAttribute("max",activityfilter.max)
      activationData = activityfilter.filter()
      getRadioSelected()
      let ind = parseInt(range.value)
      let name = rangeData.slices[selected][ind]
      sliceSelection.createImage(name,drawing,activationData)
    }
    activityfilter.minele.oninput = ()=> {
      // update the min and max
      activityfilter.min = activityfilter.minele.valueAsNumber
      activityfilter.maxele.setAttribute("min",activityfilter.min)
      activationData = activityfilter.filter()
      getRadioSelected()
      let ind = parseInt(range.value)
      let name = rangeData.slices[selected][ind]
      sliceSelection.createImage(name,drawing,activationData)
    }
  }
  return ob
}

let activityFilter = (holder)=> {
  let ob = {}
  ob.min = undefined
  ob.max = undefined
  ob.update = () => {
    //update the range sliders
    ob.maxele.setAttribute("max",`${globalinfo.scanDatamax}`)
    ob.maxele.setAttribute("min",`${ob.min}`) // prevents mins from being greater than maxs
    ob.maxele.setAttribute("step",`${ob.max/1000}`)// 1000 steps? 
    ob.minele.setAttribute("max",`${ob.max}`)
    ob.minele.setAttribute("min",`${globalinfo.scanDatamin}`)
    ob.minele.setAttribute("step",`${ob.max/1000}`)
  }
  ob.addData = (data) => {
    ob.data = data
  }
  ob.create =() => {
    // make a range slider that updates the self filter function which is called later on activity data
    // TODO add labels to the sliders
    let filterSlidermax = document.createElement("input")
    filterSlidermax.type = "range"
    // should make the max and max be global max and max with step enough for 100 increments or so
    filterSlidermax.id="activityfilterslidermax"
    ob.maxele = filterSlidermax
    let filterSlidermin = document.createElement("input")
    // should make the min and max be global min and max with step enough for 100 increments or so
    filterSlidermin.type = "range"
    filterSlidermin.id="activityfilterslidermin"
    ob.minele = filterSlidermin
    holder.append(filterSlidermin)
    holder.append(filterSlidermax)
  }
  ob.filter = () =>{
    return ob.data.map(e=> {
      if(e > ob.min && e < ob.max) {
        return e
      }
      return NaN
    })
  }
  return ob
}

let selectorCreators = (data,holder,canvasHolder,id)=> {
  let ob = {}
  ob.create = ()=> {
    // create the activity selector
    let activitySelect = document.createElement("select")
    for(let key of Object.keys(data.data)) {
      let option = document.createElement("option")
      option.value = key
      option.innerHTML = key
      activitySelect.append(option)
    }
    holder.append(activitySelect)
    //create the activity filterselector
    let filter = activityFilter(holder)
    filter.create()
    activitySelect.onchange = ()=> {
      console.log("selected ",activitySelect.value)
      //csvData[id] = data.data[activitySelect.value]
      csvRegionArray = data.data["regionName"]
      // create the drawings from the slice data
      // parse the data into numeric
      let numericData =data.data[activitySelect.value].map(e=> parseFloat(e))
      filter.addData(numericData)
      let drawing = createCanvasDrawing(holder,canvasHolder,numericData,filter)
      drawing.run()
    }

  }
  return ob 
}

let loader = (holder,canvasHolder,id)=> {
  let ob = {}
  // still a bit trigger happy
  ob.create = () => {
    // make the form that uploads the data
    let f
    let input = document.createElement("input")
    let button = document.createElement("button")
    button.innerHTML = "Load CSV"
    input.onchange =()=> {
      f = input.files[0]
    }
    input.type = "file"
    input.name ="fileupload"
    input.accept = "text/csv"
    button.addEventListener("click",()=> {
      console.log("clc")
      let xmlHttpRequest = new XMLHttpRequest();

      let fileName = f.name
      let target = "http://localhost:8080" //!! this will need to change when the site has a specific name
      let mimeType = "text/csv"

      fetch(target,{
        method:"POST",
        mode:"cors",
        headers:{
          "Content-type":"text/csv",
          "Content-disposition":`attachment;filename=${fileName}`
        },
        body:f
      }).then(
        res=> {
          console.log(res)  
          return res.text()
        }
      ).then(text=> {
        console.log(text)
        let data = csvDataReader(text)
        data.parse()
        console.log(data.data)
        // delete the previous column selector
        let prevSelect = canvasHolder.querySelector("select")
        if (prevSelect) {
          prevSelect.remove()
        }
        let prevRange = canvasHolder.querySelector("#rangeslider")
        if (prevRange) {
          prevRange.remove()
        }
        let prevLabel = canvasHolder.querySelector("#rangesliderlabel")
        if (prevLabel) {
          prevLabel.remove()
        }
        // create a select option for the columns of the data now
        let selectors = selectorCreators(data,holder,canvasHolder,id)
        selectors.create()
      })

      // trigger creation of column selection tool with the names from the first line, and pass this to the pane drawing tool
    })
    holder.append(input)
    holder.append(button)
  }
  return ob
}
let csvDataReader = (csvRawString)=> {
  let ob = {}
  ob.parse= ()=> {
    // !! think carefully about the types of errors that might come up here
    // turn this into a json that has the names of the columns as fields, and each has an array which is the data that follows
    let lines  = csvRawString.split("\r")
    let headers = lines[0].split(",")
    ob.data = {}
    headers.map(e=> {
      ob.data[e] = []
    })
    // read through the rest of the lines and add them to the data
    // although if this were running off a server, we could convert it right then, but then we have hippa concerns? ask dianne
    for (let iLine = 1;iLine < lines.length;iLine++) {
      let entries =  lines[iLine].split(",")
      for (let i = 0; i < entries.length;i++) {
        ob.data[headers[i]].push(entries[i])
      }
    }
  }
  return ob
}

let addButton = ()=> {
  let ob = {}
  ob.count = 0
  ob.create = ()=> {
    let btndiv = document.createElement("div")
    btndiv.id = "btnholder"
    let btn = document.createElement("button")
    btn.onclick = ()=> {
      // create a pane
      let first = pane(ob.count)
      console.log("adding pane")
      first.create(ob.count)
      ob.count+=1
    }
    btn.setAttribute("id","addbtn")
    btn.innerHTML = "Add Pane"
    btndiv.append(btn)
    document.body.append(btndiv)

  }
  return ob
}

async function Run() {
  let res = await fetch("http://localhost:8080/src/GeoJson_Brains/total.json")
  sliceData = await res.json()
  let btn1 = addButton()
  btn1.create()
}
Run()
