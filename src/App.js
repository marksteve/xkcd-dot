import React, { useState, useEffect } from 'react'
import styled from 'styled-components'
import * as d3 from 'd3'
import dot from 'graphlib-dot'
import dagre from 'dagre'
import rough from 'roughjs'

const margin = 10
const padding = 10

const throttle = (f, delay) => {
  let timeout
  return (...args) => {
    clearTimeout(timeout)
    timeout = setTimeout(f.bind(this, ...args), delay)
  }
}

const arrow = (parent, rc, id) => {
  const marker = parent
    .append('marker')
    .attr('id', id)
    .attr('viewBox', '0 0 10 10')
    .attr('refX', 9)
    .attr('refY', 4)
    .attr('markerUnits', 'strokeWidth')
    .attr('markerWidth', 10)
    .attr('markerHeight', 10)
    .attr('orient', 'auto')
  marker.append(() =>
    rc.path('M 0 0 L 10 4 L 0 8 L 4 4 z', {
      fill: 'inherit',
      fillStyle: 'solid'
    })
  )
}

const renderGraph = throttle((graph, root) => {
  let g
  try {
    g = dot.read(graph)
  } catch (e) {
    console.error(e)
    return
  }
  const svg = d3.create('svg')

  // Detect size of nodes
  document.body.appendChild(svg.node())
  g.nodes().forEach(n => {
    const node = g.node(n)
    const el = svg.append('text')
    el.text(node.label)
    const bbox = svg.node().getBBox()
    el.remove()
    node.width = bbox.width + 2 * padding
    node.height = bbox.height + 2 * padding
  })
  svg.remove()

  // Compute layout
  g.graph().marginx = margin
  g.graph().marginy = margin
  dagre.layout(g)

  // Setup rough options
  const rc = rough.svg(svg.node(), {
    options: {
      roughness: 0.5
    }
  })

  // Define arrow markers
  arrow(svg.append('defs'), rc, 'arrow')

  // Draw nodes
  const node = svg
    .selectAll('.node')
    .data(g.nodes().map(d => g.node(d)))
    .enter()
    .append('g')
    .classed('node', true)
  node.append(d =>
    rc.rectangle(d.x - d.width / 2, d.y - d.height / 1.75, d.width, d.height)
  )
  node
    .append('text')
    .text(d => d.label)
    .attr('text-anchor', 'middle')
    .attr('x', d => d.x)
    .attr('y', d => d.y)

  // Draw edges
  const edge = svg
    .selectAll('.edge')
    .data(g.edges().map(e => g.edge(e)))
    .enter()
    .append('g')
    .classed('edge', true)
  edge.append(d =>
    d3
      .select(rc.curve(d.points.map(p => [p.x, p.y])))
      .attr('marker-end', 'url(#arrow)')
      .node()
  )

  // Update svg
  if (root.firstChild) {
    root.replaceChild(svg.node(), root.firstChild)
  } else {
    root.appendChild(svg.node())
  }
  const { width, height } = g.graph()
  svg.attr('width', width).attr('height', height)
}, 500)

const App = styled(({ className }) => {
  const [graph, setGraph] = useState(`digraph {
  A[label="WRITE QUERIES"];
  B[label="RUN QUERIES"];
  C[label="SEE RESULTS"];
  A -> B;
  B -> C;
  C -> A;
}`)
  const svg = React.createRef()
  useEffect(() => {
    renderGraph(graph, svg.current)
  })
  return (
    <div className={className}>
      <textarea
        onChange={e => {
          setGraph(e.target.value)
        }}
        value={graph}
      />
      <div ref={svg} className='graph' />
    </div>
  )
})`
  font-family: xkcd-script;
  width: 100vw;
  height: 100vh;
  display: flex;
  textarea {
    flex: 1;
    padding: 1em;
    border: 0;
    background: #ffc;
  }
  .graph {
    flex: 2;
    display: flex;
    justify-content: center;
    align-items: center;
  }
`

export default App
