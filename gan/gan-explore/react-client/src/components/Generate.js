import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import snapshots from './snapshots.json';

export default function Generate() {
  const [view, setView] = useState();
  const [animation, setAnimation] = useState([]);
  const { register, errors, handleSubmit } = useForm({ mode: "onBlur" });
  const { register: register2, errors: errors2, handleSubmit: handleSubmit2 } = useForm({ mode: "onBlur" });
  const { register: register3, errors: errors3, handleSubmit: handleSubmit3 } = useForm({ mode: "onBlur" });

  const onSubmit = (values, ev) => {
    const form = ev.target;
    const data = {
      steps: form.steps.value,
      snapshot: "007743",
      type: form.type.value
    }
    console.log(data)
    fetch('http://localhost:8080/shuffle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
      .then(res => res.json())
      .then((data) => {
        if (data.result === "OK") {
          return getImage("forward", "1");
        } else {
          alert(data.result);
        }
      })
  };

  const getImage = async (direction, steps) => {
    await fetch('http://localhost:8080/generate?direction=' + direction + '&steps=' + steps + '&shadows=0')
      .then(response => response.json())
      .then(data => {
        setView("data:image/jpeg;base64," + data.result)
      }).catch(err => {
        console.log("Error Reading data " + err);
      })
  }

  const listAnimations = async (animationSelect) => {
    await fetch('http://localhost:8080/list')
      .then(response => response.json())
      .then(data => {
        data.animations.forEach((text) => {
          setAnimation([...animation, ...data.animations]);
        })
      });
  }

  const handleDirection = (e) => {
    e.preventDefault()
    getImage(
      e.currentTarget.dataset.direction,
      e.currentTarget.dataset.steps
    )
  }

  const handleSave = (values, e) => {
    e.preventDefault();
    const form = e.target;
    const data = {
      name: form.name.value
    }
    fetch('http://localhost:8080/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
      .then(res => res.json())
      .then((data) => {
        console.log("Result", data);
        if (data.result !== "OK") {
          alert(data.result);
        } else {
          alert("↪Your file is saved 🖥🔥");
        }
      })
  }

  const handleLoad = (values, e) => {
    e.preventDefault();
    e.preventDefault();
    const form = e.target;
    const params = {
      animation: form.animation.value
    }
    fetch('http://localhost:/load', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    })
      .then(res => res.json())
      .then((data) => {
        if (data.result.status === "new_snapshot") {
          snapshots.value = data.result.snapshot;
          return fetch('/load', {
            method: 'POST',
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(params)
          })
            .then(res => res.json())
        } else {
          return data
        }
      })
      .then((data) => {
        if (data.result.status === "OK") {
          console.log("Loading done", data);
          form.steps.value = parseInt(data.result.steps);
          return getImage("forward", "1")
        } else {
          alert(data.result.status);
        }
      });
  }

  const handleDownload = (e) => {
    e.preventDefault()
    window.open("/video?shadows=0" + "&dt=" + (new Date()).getTime(), "_blank")
  }

  useEffect(() => {
    listAnimations(animation);
  }, [])

  return (
    <>
      <div className="leftForm">
        <form key={1} className="shuffleForm" onSubmit={handleSubmit(onSubmit)}>
          {errors.singleErrorInput && "Your input is required"}
          <select className="select dataset" name="type" autoComplete="off" ref={register}>
            <option value="person" defaultValue="selected" >Person</option>
            <option value="happy" >Happy families</option>
            <option value="cats" >cats</option>
          </select>

          <label className="label snapshot">Snapshot:</label>
          <select name="select snapshot" ref={register} >
            {snapshots.snapshots.snapFamily.map(value => (
              <option key={value} value={value}>{value} </option>
            ))}
          </select>

          <select className="select shuffle" name="shffle" autoComplete="off" ref={register}>
            <option value="both" defaultValue="selected" >Shuffle both source and destination</option>
            <option value="keep_source" >Keep source and shuffle destination</option>
            <option value="use_dest">Use destination as the next source</option>
          </select>

          <label className="label steps"> Number of steps:</label>
          <input autoComplete="off" name="steps" placeholder="144" min="1" type="number" ref={register} />
          <button className="btn generate" type="onSubmit" ref={register}>Generate animation</button>
        </form>
      </div>

      <div className="output-container">
        <img className="imgAnimation" src={view} width="512" height="512" alt="" />
      </div>

      <div className="controls-container">
        <button onClick={handleDirection} className="generate" data-direction="back" data-steps="1">&lt;</button>
        <button onClick={handleDirection} className="generate" data-direction="forward" data-steps="1">&gt;</button>
        <button onClick={handleDirection} className="generate" data-direction="back" data-steps="10">&lt;10</button>
        <button onClick={handleDirection} className="generate" data-direction="forward" data-steps="10">10&gt;</button>
        <button onClick={handleDirection} className="generate" data-direction="back" data-steps="100">&lt;100</button>
        <button onClick={handleDirection} className="generate" data-direction="forward" data-steps="100">100&gt;</button>
      </div>

      <div className="saveLoad">
        <form className="saveForm" key={2} id="save" onSubmit={handleSubmit2(handleSave)}>
          <label className="label save">Save animation as:</label>
          <input className="input save" autoComplete="off" name="name" type="text" ref={register2} />
          <button className="btn save" type="submit" ref={register2}>Save</button>
          <button className="btn download" id="download-video" onClick={handleDownload}>Download video</button>
        </form>

        <form className="loadForm" key={3} id="load" onSubmit={handleSubmit3(handleLoad)}>
          <label className="label load">Load animation:</label>
          <select className="select load" autoComplete="off" name="animation" ref={register3}>
            {animation.map(value => (
              <option key={value} value={value} >{value}</option>
            ))}
          </select>
          <button className="btn load" type="submit" ref={register3}>Load</button>
        </form>
      </div>
    </>
  );
}