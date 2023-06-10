import chai, {expect} from "chai"

import * as pureimage from "../src/index.js"

describe('context',() => {
    let image
    let context

    beforeEach(() => {
        image = pureimage.make(200,200)
        context = image.getContext('2d')
    })

    it('getContext returns the same context', (done) => {
        expect(image.getContext('2d')).to.eq(context)
        done()
    })

    it('getContext returns null for invalid contextType', (done) => {
        expect(image.getContext('this is totally made up')).to.eq(null)
        done()
    })

})
