import data from "./gz_2010_us_040_00_500k.json"
let globals =[1000,1000,-1000,-1000]
let drawLine = (linedata,ctx)=> {
  let ob = {}
  // need canvas ref
  ob.draw =() => {
    ctx.beginPath()
    let first = linedata[0]
    ctx.moveTo(20*(first[0]+180),20*(first[1]))
    for (let i = 1; i < linedata.length;i++) {
      let pt = linedata[i]
      ctx.lineTo(20*(pt[0]+180),20*(pt[1]) )
      // update the data
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
    ctx.closePath()
    ctx.stroke()
  }
  return ob
}

let setup = () => {
  let ob = {}
  ob.begin = (height,width) => {
    let can = document.createElement("canvas")
    document.body.append(can)
    ob.can = can
    can.height = height
    can.width = width
    ob.ctx = can.getContext("2d")
  }
  return ob
}

let dataBind = (drawing,data_to_bind) => {
  // drawing has can and ctx attributes
  // find a way get to the data we need here
  let iter = 0  
  for (line of data_to_bind.geometry.coordinates) {
  let data_bound = line[0]
  let line = drawLine(data_bound,drawing.ctx)
  line.draw()
    iter +=1
  }
}

let featurePass = (drawing,upperData) => {
  let ob = {}
  ob.mapFeatures = () => {
  for (let feature of upperData.features) {
    let db = dataBind(drawing,feature)
  }
  }
  return ob
}

//for each state have something which goes through the 
//  coordinates is an array of 
//
// aim for as much functional as possible

let drawing = setup()
drawing.begin(5000,5000)
let allfeatures = featurePass(drawing,data)
allfeatures.mapFeatures()
console.log(globals)
