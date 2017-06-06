import React from 'react'
import Board from './board'
import Inspector from './inspector'
import Peers from './peers'
import Clocks from './clocks'
import Store from '../lib/store'
import { ipcRenderer, remote } from 'electron'
import fs from 'fs'
import Path from 'path'

export default class App extends React.Component {
  constructor(props) {
    super(props)

    window.app    = this
    this.autoSave = this.autoSave.bind(this)
    this.state    = { savePath: null }
    this.store    = new Store()

    this.store.subscribe(() => {
      // Force component to re-render
      this.setState({})
      this.autoSave()
    })

    ipcRenderer.on("new", (event) => {
      this.open()
    })

    ipcRenderer.on("open", (event, files) => {
      if(files && files.length > 0) {
        let openPath  = files[0]

        this.open(openPath)
        this.autoSave()
      }
    })

    ipcRenderer.on("merge", (event, files) => {
      if(files && files.length > 0) {
        let file = fs.readFileSync(files[0])

        this.store.dispatch({
          type: "MERGE_DOCUMENT",
          file: file
        })
      }
    })

    ipcRenderer.on("save", (event, savePath) => {
      if(savePath) {
        let name = Path.parse(savePath).name

        this.setState({ savePath: savePath }, () => {
          remote.getCurrentWindow().setTitle(name)
          localStorage.setItem("lastFileOpened", savePath)
          this.autoSave()
        })
      }
    })
  }

  componentDidMount() {
    let lastFileOpened = localStorage.getItem("lastFileOpened")

    if(lastFileOpened && fs.existsSync(lastFileOpened))
      this.open(lastFileOpened)
    else
      this.open()
  }

  open(path) {
    if(path) {
      this.setState({ savePath: path }, () => {
        let file = fs.readFileSync(path)
        let name = Path.parse(path).name

        this.store.dispatch({ type: "OPEN_DOCUMENT", file: file })
        remote.getCurrentWindow().setTitle(name)
        localStorage.setItem("lastFileOpened", path)
      })
    }
    else {
      this.setState({ savePath: null }, () => {
        this.store.dispatch({ type: "NEW_DOCUMENT" })
        remote.getCurrentWindow().setTitle("Untitled")
      })
    }
  }

  autoSave() {
    if(this.state.savePath) {
      console.log("Auto saving…")
      let exportFile = this.store.save()
      fs.writeFileSync(this.state.savePath, exportFile)
    }
  }

  render() {
    return (
      <div className="App">
        <Board store={ this.store } />
        <Inspector store={ this.store } />
        <div className="sidebar">
          <Peers network={ this.store.network } />
          <Clocks network={ this.store.network } />
        </div>
      </div>
    )
  }
}
