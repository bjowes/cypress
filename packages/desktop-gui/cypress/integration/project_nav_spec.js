describe('Project Nav', function () {
  const _ = Cypress._

  beforeEach(function () {
    cy.fixture('user').as('user')
    cy.fixture('config').as('config')
    cy.fixture('runs').as('runs')
    cy.fixture('specs').as('specs')

    cy.visitIndex().then(function (win) {
      let start = win.App.start

      this.win = win
      this.ipc = win.App.ipc

      cy.stub(this.ipc, 'getOptions').resolves({ projectRoot: '/foo/bar' })
      cy.stub(this.ipc, 'updaterCheck').resolves(false)
      cy.stub(this.ipc, 'getCurrentUser').resolves(this.user)
      cy.stub(this.ipc, 'getRuns').resolves(this.runs)
      cy.stub(this.ipc, 'getSpecs').yields(null, this.specs)
      cy.stub(this.ipc, 'getRecordKeys').resolves([])
      cy.stub(this.ipc, 'launchBrowser')
      cy.stub(this.ipc, 'closeBrowser').resolves(null)
      cy.stub(this.ipc, 'pingApiServer').resolves()
      cy.stub(this.ipc, 'closeProject')
      cy.stub(this.ipc, 'externalOpen')
      cy.stub(this.ipc, 'offOpenProject')
      cy.stub(this.ipc, 'offGetSpecs')
      cy.stub(this.ipc, 'offOnFocusTests')

      this.openProject = this.util.deferred()
      cy.stub(this.ipc, 'openProject').returns(this.openProject.promise)

      start()
    })
  })

  context('project nav', function () {
    beforeEach(function () {
      this.openProject.resolve(this.config)
    })

    it('displays projects nav', function () {
      cy.get('.empty').should('not.be.visible')

      cy.get('.navbar-default')
    })

    it('displays \'Tests\' nav as active', () => {
      cy.get('.navbar-default').contains('a', 'Tests')
      .should('have.class', 'active')
    })

    describe('when project loads', function () {
      beforeEach(() => {
        cy.wait(600)
      })

      it('displays \'Tests\' page', () => {
        cy.contains('integration')
      })
    })

    describe('runs page', function () {
      beforeEach(function () {
        cy.fixture('runs').as('runs')

        cy.get('.navbar-default')
        .contains('a', 'Runs').as('runsNav').click()
      })

      it('highlights runs on click', () => {
        cy.get('@runsNav')
        .should('have.class', 'active')
      })

      it('displays runs page', function () {
        cy.get('.runs-container li')
        .should('have.length', this.runs.length)
      })
    })

    describe('settings page', function () {
      beforeEach(() => {
        cy.get('.navbar-default')
        .contains('a', 'Settings').as('settingsNav').click()
      })

      it('highlights config on click', () => {
        cy.get('@settingsNav')
        .should('have.class', 'active')
      })

      it('displays settings page', () => {
        cy.contains('Configuration')
      })
    })
  })

  context('browsers dropdown', function () {
    describe('browsers available', function () {
      beforeEach(function () {
        this.openProject.resolve(this.config)
      })

      context('normal browser list behavior', function () {
        it('lists browsers', function () {
          const { browsers } = this.config

          cy.get('.browsers li')
          .should('have.length', browsers.length)
          .each(function ($li, i) {
            expect($li).to.contain(browsers[i].displayName)
          })
        })

        it('displays browsers icons', function () {
          cy.get('.browsers .browser-icon')
          .each(function ($icon, i) {
            const name = _.camelCase(this.config.browsers[i].name)

            if (name === 'custom') {
              expect($icon).to.have.class('fa-globe')

              return
            }

            const imgName = name === 'canary' ? 'chrome-canary' : name

            expect($icon).to.have.attr('src', `./img/${imgName}_16x16.png`)
          })
        })

        it('shows info icon with tooltip for browsder with info', function () {
          const browserWithInfo = _.find(this.config.browsers, (b) => !!b.info)

          cy.get('.browsers-list .dropdown-chosen').click()
          cy.get('.browsers .fa-info-circle').trigger('mouseover')

          cy.get('.cy-tooltip')
          .should('contain', browserWithInfo.info)
        })

        it('does not display stop button', () => {
          cy.get('.close-browser').should('not.exist')
        })

        describe('default browser', function () {
          it('displays default browser name in chosen', () => {
            cy.get('.browsers-list .dropdown-chosen')
            .should('contain', 'Chrome')
          })

          it('displays default browser icon in chosen', () => {
            cy.get('.browsers-list .dropdown-chosen')
            .find('.browser-icon').should('have.attr', 'src', './img/chrome_16x16.png')
          })
        })
      })

      context('switch browser', function () {
        beforeEach(function () {
          cy.get('.browsers-list .dropdown-chosen').click()

          cy.get('.browsers-list').find('.dropdown-menu')
          .contains('Chromium').click()
        })

        afterEach(() => {
          cy.clearLocalStorage()
        })

        it('switches text in button on switching browser', () => {
          cy.get('.browsers-list .dropdown-chosen').contains('Chromium')
        })

        it('swaps the chosen browser into the dropdown', function () {
          cy.get('.browsers-list').find('.dropdown-menu')
          .find('li').should('have.length', this.config.browsers.length - 1)
          .each(function ($li, i) {
            const dropdownBrowsers = Cypress._.filter(this.config.browsers, (b) => {
              // Chrome is shown in selection, so skip it
              return b.displayName !== 'Chromium'
            })

            expect($li).to.contain(dropdownBrowsers[i].displayName)
          })
        })

        it('saves chosen browser in local storage', () => {
          expect(localStorage.getItem('chosenBrowser')).to.eq('chromium')
        })
      })

      context('opening browser by choosing spec', function () {
        beforeEach(() => {
          cy.contains('.file', 'app_spec').click()
        })

        it('displays browser icon as spinner', () => {
          cy.get('.browsers-list .dropdown-chosen').find('i')
          .should('have.class', 'fas fa-sync-alt fa-spin')
        })

        it('disables browser dropdown', () => {
          cy.get('.browsers-list .dropdown-chosen')
          .should('have.class', 'disabled')
        })
      })

      context('browser opened after choosing spec', function () {
        beforeEach(function () {
          this.ipc.launchBrowser.yields(null, { browserOpened: true })

          cy.contains('.file', 'app_spec').click()
        })

        it('displays browser icon as opened', () => {
          cy.get('.browsers-list .dropdown-chosen').find('i')
          .should('have.class', 'fas fa-check-circle')
        })

        it('disables browser dropdown', () => {
          cy.get('.browsers-list .dropdown-chosen')
          .should('have.class', 'disabled')
        })

        it('displays stop browser button', () => {
          cy.get('.close-browser').should('be.visible')
        })

        it('sends the required parameters to launch a browser', function () {
          const browserArg = this.ipc.launchBrowser.getCall(0).args[0].browser

          expect(browserArg).to.have.keys([
            'family', 'name', 'path', 'version', 'majorVersion', 'displayName', 'info', 'isChosen', 'custom', 'warning',
          ])

          expect(browserArg.path).to.include('/')
          expect(browserArg.family).to.equal('chrome')
        })

        describe('stop browser', function () {
          beforeEach(() => {
            cy.get('.close-browser').click()
          })

          it('calls close:browser on click of stop button', function () {
            expect(this.ipc.closeBrowser).to.be.called
          })

          it('hides close button on click of stop', () => {
            cy.get('.close-browser').should('not.exist')
          })

          it('re-enables browser dropdown', () => {
            cy.get('.browsers-list .dropdown-chosen')
            .should('not.have.class', 'disabled')
          })

          it('displays default browser icon', () => {
            cy.get('.browsers-list .dropdown-chosen')
            .find('.browser-icon').should('have.attr', 'src', './img/chrome_16x16.png')
          })
        })

        describe('browser is closed manually', function () {
          beforeEach(function () {
            this.ipc.launchBrowser.yield(null, { browserClosed: true })
          })

          it('hides close browser button', () => {
            cy.get('.close-browser').should('not.be.visible')
          })

          it('re-enables browser dropdown', () => {
            cy.get('.browsers-list .dropdown-chosen')
            .and('not.have.class', 'disabled')
          })

          it('displays default browser icon', () => {
            cy.get('.browsers-list .dropdown-chosen .browser-icon')
            .should('have.attr', 'src', './img/chrome_16x16.png')
          })
        })
      })
    })

    describe('local storage saved browser', function () {
      beforeEach(function () {
        localStorage.setItem('chosenBrowser', 'chromium')

        this.openProject.resolve(this.config)
      })

      afterEach(() => {
        cy.clearLocalStorage()
      })

      it('displays local storage browser name in chosen', () => {
        cy.get('.browsers-list .dropdown-chosen')
        .should('contain', 'Chromium')
      })

      it('displays local storage browser icon in chosen', () => {
        cy.get('.browsers-list .dropdown-chosen .browser-icon')
        .should('have.attr', 'src', './img/chromium_16x16.png')
      })
    })

    describe('when browser saved in local storage no longer exists', function () {
      beforeEach(function () {
        localStorage.setItem('chosenBrowser', 'netscape-navigator')

        this.openProject.resolve(this.config)
      })

      it('defaults to first browser', () => {
        cy.get('.browsers-list .dropdown-chosen')
        .should('contain', 'Chrome')
      })
    })

    describe('only one browser available', function () {
      beforeEach(function () {
        this.config.browsers = [{
          name: 'electron',
          family: 'electron',
          displayName: 'Electron',
          version: '50.0.2661.86',
          path: '',
          majorVersion: '50',
        }]

        this.openProject.resolve(this.config)
      })

      it('displays no dropdown btn', () => {
        cy.get('.browsers-list')
        .find('.dropdown-toggle').should('not.be.visible')
      })
    })

    describe('browser has a warning attached', function () {
      beforeEach(function () {
        this.config.browsers = [
          {
            'name': 'chromium',
            'displayName': 'Chromium',
            'family': 'chrome',
            'version': '49.0.2609.0',
            'path': '/Users/bmann/Downloads/chrome-mac/Chromium.app/Contents/MacOS/Chromium',
            'majorVersion': '49',
            'warning': 'Cypress detected policy settings on your computer that may cause issues with using this browser. For more information, see https://on.cypress.io/bad-browser-policy',
          },
        ]

        this.openProject.resolve(this.config)
      })

      it('shows warning icon with linkified tooltip', function () {
        cy.get('.browsers .fa-exclamation-triangle').trigger('mouseover')

        cy.get('.cy-tooltip').should('contain', 'Cypress detected policy settings on your computer that may cause issues with using this browser. For more information, see')
        cy.get('.cy-tooltip a').click().then(function () {
          expect(this.ipc.externalOpen).to.be.calledWith('https://on.cypress.io/bad-browser-policy')
        })
      })
    })

    describe('custom browser', function () {
      beforeEach(function () {
        this.config.browsers[this.config.browsers.length - 1].custom = true

        this.openProject.resolve(this.config)
      })

      it('displays generic icon', () => {
        cy.get('.browsers-list .dropdown-chosen .browser-icon')
        .should('have.class', 'fa-globe')
      })

      it('pre-selects the custom browser', () => {
        cy.get('.browsers-list .dropdown-chosen')
        .should('contain', 'Custom')
      })

      it('pre-selects the custom browser if chosenBrowser saved locally', function () {
        localStorage.setItem('chosenBrowser', 'Custom')
        cy.get('.browsers-list .dropdown-chosen')
        .should('contain', 'Custom')
      })
    })
  })

  context('issue #869 - nav responsiveness', function () {
    beforeEach(function () {
      this.openProject.resolve(this.config)
    })

    it('main nav does not block project nav when long project name pushes it to multiple lines', () => {
      cy.viewport(400, 400)
      cy.get('.project-nav').should('be.visible')
    })
  })
})
