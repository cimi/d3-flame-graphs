require('coffee-script/register');
path    = require('path')
exec    = require('child_process').exec
d3      = require('d3')
chai    = require('chai')
expect  = chai.expect
chai.use(require('chai-things'))

# the flame graph plugin does not have an exporter
# as it augments the existing d3 object
require('../src/d3-flame-graph')

describe 'd3.flameGraph.hide', ->
  original = require('./data/profile-test.json')
  data = undefined
  describe 'when hiding nodes', ->
    beforeEach (done) ->
      # deep copy because of require caching
      data = JSON.parse(JSON.stringify(original))
      data = d3.flameGraphUtils.augment(data)
      d3.flameGraphUtils.partition(data)
      done()

    it 'should reset the set node values to 0', ->
      target = [data.children[1].children[0]]
      d3.flameGraphUtils.hide(target)
      expect(target[0]).to.have.property('value', 0)

    it 'should subtract value from all parents', ->
      d3.flameGraphUtils.hide([data.children[1].children[0]])
      expect(data.children[1]).to.have.property('value', 20)
      expect(data).to.have.property('value', 60)

    it 'should make the value of all children 0', ->
      d3.flameGraphUtils.hide([data.children[1]])
      expect(data.children[1].children).to.all.have.property('value', 0)

    it 'should correctly compute values when more than one node is hidden', ->
      d3.flameGraphUtils.hide([data.children[0].children[0], data.children[1].children[0]])
      expect(data).to.have.property('value', 50)
      expect(data.children[0]).to.have.property('value', 20)
      expect(data.children[1]).to.have.property('value', 20)

    it 'should store the value that was hidden in a list on each parent', ->
      d3.flameGraphUtils.hide([data.children[0].children[0], data.children[1].children[0]])
      expect(data).to.have.property('hidden').to.have.members([10, 40])
      expect(data.children[0]).to.have.property('hidden').to.have.members([10])
      expect(data.children[1]).to.have.property('hidden').to.have.members([40])

  describe 'when unhiding nodes', ->
    beforeEach (done) ->
      # deep copy because of require caching
      data = JSON.parse(JSON.stringify(original))
      data = d3.flameGraphUtils.augment(data)
      d3.flameGraphUtils.partition(data)
      done()

    it 'should reset target nodes to their original values', ->
      target = [data.children[1].children[0]]
      d3.flameGraphUtils.hide(target)
      d3.flameGraphUtils.hide(target, true)
      expect(target[0]).to.have.property('value', 40)
      expect(target[0]).to.have.property('originalValue', 40)