import React, { Component } from 'react';
import { $dontShowNaN, $percentRoi, $currencySymbol, $numberWithCommas } from './Helpers';
import Coin from './Coin';
import './App.css';

import PieChart from './PieChart';

class App extends Component {
  constructor () {
    super();

    this._toggleMenu = this._toggleMenu.bind(this);
    this._toggleCoinInfo = this._toggleCoinInfo.bind(this);
    this._closeCoinInfo = this._toggleCoinInfo.bind(this);
    this._onChange = this._onChange.bind(this);
    this._handleSubmit = this._handleSubmit.bind(this);
    this._handleSelectChange = this._handleSelectChange.bind(this);
    this._updateLocalWithSave = this._updateLocalWithSave.bind(this);
    this._hideAddApp = this._hideAddApp.bind(this);
    this._toggleVisibility = this._toggleVisibility.bind(this);
    this._togglePie = this._togglePie.bind(this);
    this._toggleBarView = this._toggleBarView.bind(this);

    const userHasCoins = Boolean(localStorage.hasOwnProperty('coinz') && Object.keys(JSON.parse(localStorage.coinz)).length);

    this.state = {
      menu_visibility: "hidden",
      coin_visibility: "hidden",
      pie_menu_visibility: userHasCoins ? "visible" : "hidden",
      pie_chart_visibility: "hidden",
      bar_menu_visibility: "hidden",
      isListVisible: "visible",
      coin_info: "", // defualt required for child <Coin/>
      add_ticker: "",
      add_cost_basis: "",
      add_hodl: "",
      coinz: {},
      portfolio_total: null,
      preferences: {
        currency: "USD"
      },
      coinfox_holdings: ""
    }
  }

  componentWillMount(){
    // if user doesnt have json
    if (!localStorage.hasOwnProperty('coinz')) {
      const localCoins = {};
      // object to array for map
      const lStore = Object.entries(localStorage);
      lStore.map((key) => {
        const ticker = key[0].replace(/_.*/i, '');
        const cost = ticker + "_cost_basis";
        const hodl = ticker + "_hodl";

        // if localCoins doesnt have the ticker yet, create it
        // add localStorage key to localCoins for state
        if (!localCoins.hasOwnProperty(ticker)) {
          localCoins[ticker] = {hodl: null, cost_basis: null};
          if (key[0] === cost) {
            // key[x] needs to be converted into number
            localCoins[ticker].cost_basis = Number(key[1]);
          } else if (key[0] === hodl) {
            localCoins[ticker].hodl = Number(key[1]);
          } else {
            console.log('invalid localStorage');
          }
        // localCoins has the ticker, so we add to it instead
        } else {
          if (key[0] === cost) {
            localCoins[ticker].cost_basis = Number(key[1]);
          } else if (key[0] === hodl) {
            localCoins[ticker].hodl = Number(key[1]);
          } else {
            console.log('invalid localStorage');
          }
        }
      })
      // convert to string for localStorage
      const stringCoins = JSON.stringify(localCoins);
      const jsonCoins = JSON.parse(stringCoins);
      // clear out old way of localStorage
      localStorage.clear();
      // add new json string to localStorage
      localStorage.setItem('coinz', stringCoins);

      const newCoinsState = {
        coinz: jsonCoins
      }
      this.setState(newCoinsState);
    } else if (localStorage.hasOwnProperty('coinz')) {
      const jsonCoins = JSON.parse(localStorage.coinz);
      const localPref = localStorage.pref
        ? JSON.parse(localStorage.pref)
        : this.state.preferences;
      const newCoinsState = {
        coinz: jsonCoins,
        preferences: {
          currency: localPref.currency
        }
      }

      this.setState(newCoinsState);
    }



  }

  componentDidMount(){
    this._marketPrice();
  }

  _costBasis(){
    var cost = 0;

    for (var coin in this.state.coinz) {
      const cost_basis = this.state.coinz[coin].cost_basis;
      const hodl = this.state.coinz[coin].hodl;
      if (hodl){
        cost = cost + (hodl * cost_basis);
      }
    }

    return cost //.toFixed(2);
  }

  _portfolioValue(){
    var value = 0;

    for (var coin in this.state.coinz) {
      const hodl = this.state.coinz[coin].hodl;
      const curr_price = this.state.coinz[coin].curr_price;
      if (hodl){
        value = value + (hodl * curr_price);
      }
    }
    return value;
  }

  _totalGainLoss(){
    return ( this._portfolioValue() - this._costBasis() ) //.toFixed(2);
  }

  _marketPrice(){
    const tempState = this.state.coinz;
    let currency = this.state.preferences.currency.toLowerCase();
    var userCurrency;

    // currencies to be converted
    // maybe make array indexOf [aud,xxx,etc]
    const extendedCurrencies = [
      "aud",
      "bgn",
      "brl",
      "chf",
      "czk",
      "dkk",
      "hkd",
      "hrk",
      "huf",
      "idr",
      "ils",
      "inr",
      "krw",
      "mxn",
      "myr",
      "nok",
      "nzd",
      "php",
      "pln",
      "ron",
      "sek",
      "sgd",
      "thb",
      "try",
      "zar"
    ];

    if (extendedCurrencies.indexOf(currency) > -1){
      userCurrency = currency.toUpperCase();
      currency = 'usd';
    }


    for (var coin in this.state.coinz) {
      var count = 1;
      const numCoins = Object.keys(this.state.coinz).length;
      const endpoint = 'https://api.cryptonator.com/api/ticker/'+ coin.toLowerCase() + '-' + currency;
      // if there is a valid coin, easy to add a "" coin, fix form to not submit w/o value
      if (coin){
        fetch(endpoint)
        .then(function(res) {
          if (!res.ok) {
              throw Error(res.statusText);
          }
          return res;
        })
        .then((res) => res.json())
        .then(function(res){

          let price = res.ticker.price;
          const volume24hr = res.ticker.volume;
          const change1hr = res.ticker.change;
          const tickerBase = res.ticker.base.toLowerCase()

          // CONVERTING CURRENCY
          if (userCurrency){
            const endpoint = 'https://api.fixer.io/latest?base=USD&symbols=' + userCurrency;

            return fetch(endpoint)
              .then(function(res) {
                if (!res.ok) {
                    throw Error(res.statusText);
                }
                return res;
              })
              .then((res) => res.json())
              .then((res)=> {
                  return ({
                    conversionRate: res.rates[userCurrency],
                    theCoin: tickerBase,
                    price: price
                  });
                }
              )
          } else {
            return {
              conversionRate: 1,
              theCoin: tickerBase,
              price: price,
              volume24hr: volume24hr,
              change1hr: change1hr
            }
          }
          // END CURRENCY CONVERSION
        })
        .then(function(newRes){

          let displayPrice =  Number(newRes.price);
          if (newRes.conversionRate !== 1) {
            displayPrice = newRes.conversionRate * displayPrice;
          }
          tempState[newRes.theCoin].curr_price = displayPrice;
        })
        .then(function(){
          count++;
          if (count >= numCoins) {
            this.setState({coinz: tempState});
          }
        }.bind(this))
      }


    }

  }

  _toggleVisibility(element){
    if (this.state[element] === "hidden") {
      this.setState({[element]: "visible"})
    } else {
      this.setState({[element]: "hidden"})
    }
  }

  _toggleMenu(){
    this._toggleVisibility("menu_visibility");
    this._toggleVisibility("isListVisible");
  }

  _togglePie(){
    //alert('pie');
    // this._toggleVisibility("menu_visibility");
    this._toggleVisibility("isListVisible");
    this._toggleVisibility("pie_chart_visibility");
    this._toggleVisibility("pie_menu_visibility");
    this._toggleVisibility("bar_menu_visibility");
  }

  _toggleBarView(){
    //alert('pie');
    // this._toggleVisibility("menu_visibility");
    this._toggleVisibility("isListVisible");
    this._toggleVisibility("pie_chart_visibility");
    this._toggleVisibility("pie_menu_visibility");
    this._toggleVisibility("bar_menu_visibility");
  }

  _handleSubmit (e) {
    e.preventDefault();

    const currentCoins = JSON.parse(localStorage.coinz) || {};
    const ticker = this.state.add_ticker.toLowerCase();
    const costBasis = Number(this.state.add_cost_basis);
    const hodl = Number(this.state.add_hodl);

    currentCoins[ticker] = {
      cost_basis: costBasis,
      hodl: hodl
    }

    const stringCoins = JSON.stringify(currentCoins);
    if (ticker && costBasis >= 0 && hodl) {
      localStorage.setItem("coinz", stringCoins);
      window.location.href = window.location.href;
    } else {
      alert("Please fill in the ticker, cost basis & holding")
    }

  }


  _handleSelectChange(e){
    const domElement = e.target.id;
    const statePref = this.state.preferences;
    const localPref = localStorage.pref
      ? JSON.parse(localStorage.pref)
      : {};

    localPref[domElement] = e.target.value;
    statePref[domElement] = e.target.value;

    localStorage.setItem('pref', JSON.stringify(localPref));
    this.setState(statePref);
    this._marketPrice();
  }

  _onChange (e) {
    var text = e.target.value;
    var item = e.target.className;

    this.setState({[item]: text});
  }

  _closeCoinInfo () {
    this.setState({coin_visibility: ""});
  }

  _toggleCoinInfo (e) {
    const coin = e.target.id;
    this.setState({coin_info: coin});

    this._toggleVisibility("coin_visibility");
    this._toggleVisibility("pie_menu_visibility");
  }

  _downloadLocalStorage () {
    function download(filename, objectOfStrings) {
      const coinz = objectOfStrings.coinz;
      const pref = objectOfStrings.pref;
      const json = {};

      if (coinz) {
        json["coinz"] = JSON.parse(coinz);
      }
      if (pref) {
        json["pref"] = JSON.parse(pref);
      }

      var text = JSON.stringify(json);

      var element = document.createElement('a');
      element.setAttribute('href', 'data:text/plain;charset=utf-8,' + text);
      element.setAttribute('download', filename);

      element.style.display = 'none';
      document.body.appendChild(element);

      element.click();

      document.body.removeChild(element);
    }
    download('coinfox_holdings.txt', localStorage );
  }

  _updateLocalWithSave(e){
    e.preventDefault();

    const saveToLocalStorage = JSON.parse(this.state.coinfox_holdings);
    const coinz = saveToLocalStorage.coinz;
    const pref = saveToLocalStorage.pref;

    if (coinz) {
      localStorage.setItem('coinz', JSON.stringify(coinz));
    } else {
      alert("Something is wrong with your Save File, please try downloading it again");
    }
    if (pref) {
      localStorage.setItem('pref', JSON.stringify(pref));
    }

    location.reload();

  }

  _hideAddApp () {
    localStorage.setItem('seenAddApp', "true");
    this.forceUpdate();
  }

  render() {
    const coinCloseClass = this.state.coin_visibility + " coin-close fa fa-lg fa-times";

    const coinStats = Object.entries(this.state.coinz)
    const sortCoins = (coinStats) => {
      coinStats.sort((a, b) => {
        const aHodl = a[1].curr_price * a[1].hodl;
        const bHodl = b[1].curr_price * b[1].hodl;
        return bHodl - aHodl;
      })
      return coinStats
    }
    const sortedStats = sortCoins(coinStats);

    const totalGainLoss = this._totalGainLoss();
    const currencyPref = this.state.preferences.currency
    const avgCostBasis = "Average Cost Basis ("+ $currencySymbol(this.state.preferences.currency) +"/per coin)"
    const headerColor = totalGainLoss < 0
      ? "App-header red"
      : "App-header";
    const gainz = Object.keys(this.state.coinz).length
      ? $currencySymbol(this.state.preferences.currency) + $numberWithCommas($dontShowNaN(totalGainLoss).toFixed(2)) + " (" + $numberWithCommas($dontShowNaN($percentRoi(this._portfolioValue(), this._costBasis()).toFixed(2))) + "%)"
      : "Use the menu to add your coin holdings";

    const shouldShowBanner = window.location.hostname === "vinniejames.de" ? "banner" : "banner hidden";

    const supportedCurrencies = [
      "aud",
      "bgn",
      "brl",
      "btc",
      "cad",
      "chf",
      "cny",
      "czk",
      "dkk",
      "eur",
      "gbp",
      "hkd",
      "hrk",
      "huf",
      "idr",
      "ils",
      "inr",
      "jpy",
      "krw",
      "mxn",
      "myr",
      "nok",
      "nzd",
      "php",
      "pln",
      "ron",
      "rur",
      "sek",
      "sgd",
      "thb",
      "try",
      "uah",
      "usd",
      "zar"
    ];
    const selectCurrency = supportedCurrencies.map((cur) => {
      return <option key={cur} value={cur.toUpperCase()}>{cur.toUpperCase()} {$currencySymbol(cur)}</option>
    });

    const pie_data = coinStats.map(coin => {
      const total_hodl = coin[1].hodl * coin[1].curr_price;
      const hodl_percentage = ( total_hodl / this._portfolioValue() ) * 100;

      return ({
        name: coin[0].toUpperCase(),
        y: hodl_percentage // return a percentage
      })
    });

    const pie_chart_data = [{
      name: 'HODL',
      colorByPoint: true,

      data: pie_data
      //   [{
      //   name: 'BTC',
      //   y: 56.33
      // }, {
      //   name: 'LTC',
      //   y: 24.03,
      //   sliced: true,
      //   selected: true
      // }, {
      //   name: 'ETH',
      //   y: 10.38
      // }, {
      //   name: 'BCH',
      //   y: 4.77
      // }, {
      //   name: 'GNT',
      //   y: 0.91
      // }, {
      //   name: 'STRAT',
      //   y: 0.2
      // }]
    }];



    return (
      <div className="App">
        <div className={shouldShowBanner}>
          <p className="text-center">
            Moving to a new home: <a className="red" href="http://coinfox.co">Coinfox.co</a>! <br/>
            Please use the import/export feature to move your data.
          </p>
        </div>
        <i onClick={this._toggleMenu} className="btn-menu fa fa-lg fa-bars" aria-hidden="true"></i>
        <div id="menu-body" className={this.state.menu_visibility}>
          <i onClick={this._toggleMenu} className="btn-menu fa fa-lg fa-times" aria-hidden="true"></i>

          <label htmlFor="currency">{$currencySymbol(this.state.preferences.currency) || "USD"}</label>
          <select id="currency" onChange={this._handleSelectChange} value={currencyPref} name="select">

            {selectCurrency}

          </select>

          <hr />
          <h3>Add a Coin</h3>
          <form className="" onSubmit={this._handleSubmit}>
                <input type="text"
                  autoComplete='off' spellCheck='false' autoCorrect='off'
                  className="add_ticker"
                  onChange={this._onChange}
                  value={this.state.ticker}
                  placeholder="Ticker: (BTC, LTC, etc)"/>
                  <br/>
                <input type="text"
                  autoComplete='off' spellCheck='false' autoCorrect='off'
                  className="add_cost_basis"
                  onChange={this._onChange}
                  value={this.state.cost_basis}
                  placeholder={avgCostBasis}/>
                  <br/>
                <input type="text"
                  autoComplete='off' spellCheck='false' autoCorrect='off'
                  className="add_hodl"
                  onChange={this._onChange}
                  value={this.state.hodl}
                  placeholder="Number of Coins Held"/>
                <br/>
                <input className="" type="submit" value="Go"/>
            </form>

            <hr/>
            <h3>Transfer your data to another device</h3>
            <br/>
            <a className="btn pointer" onClick={this._downloadLocalStorage}><i className="fa fa-lg fa-download" aria-hidden="true"></i> Download your Save File</a>
            <br/><br/><br/><br/>
            Then, on your new device
            <br/><br/>
            Copy/Paste the contents of your Save File below
            <br/>
            <form className="" onSubmit={this._updateLocalWithSave}>
              <input type="text"
                className="coinfox_holdings"
                onChange={this._onChange}
                value={this.state.coinfox_holdings}
                placeholder="Paste Save File contents here"/>
              <input className="" type="submit" value="Save"/>
            </form>



        </div>

        <i onClick={this._togglePie} className={this.state.pie_menu_visibility + " btn-pie fa fa-lg fa-pie-chart"} aria-hidden="true"></i>
        <i onClick={this._toggleBarView} className={this.state.bar_menu_visibility + " btn-pie fa fa-lg fa-th-list"} aria-hidden="true"></i>

        <div className={headerColor}>
          <div className="Overview">
          <h1>
            {$currencySymbol(this.state.preferences.currency)}{$numberWithCommas($dontShowNaN(this._portfolioValue()).toFixed(2))}
          </h1>
          <h2>
            {gainz}
          </h2>
          </div>
        </div>

        <PieChart chart_data={pie_chart_data} container="pie_chart_view" isVisible={this.state.pie_chart_visibility} />

        <span className={this.state.isListVisible + " main-coin-listing"}>
        <div className="Coins">
          {sortedStats.map(function(coin, i){
            const ticker = coin[0].toUpperCase();
            const hodl = parseFloat(Number(coin[1].hodl).toFixed(2));
            const gain_loss = ((Number(coin[1].curr_price) - Number(coin[1].cost_basis) ) * Number(coin[1].hodl) ).toFixed(2);
            const curr_price = Number(coin[1].curr_price).toFixed(2);
            const color = gain_loss >= 0 ? "green" : "red";

            if (!Number(hodl)) {
              return null;
            } else {
              return (
                <div id={ticker} onClick={this._toggleCoinInfo} key={i} className="coin">
                  <p className="float-left">
                    {ticker}<br/>
                    <span>{$numberWithCommas(hodl)} Coins</span>
                  </p>
                  <i className="fa fa-lg fa-info-circle" aria-hidden="true"></i>
                  <p className="text-right float-right">
                    <span className={color}>{$currencySymbol(this.state.preferences.currency)}{$numberWithCommas($dontShowNaN(gain_loss))}</span><br/>
                    <span>{$currencySymbol(this.state.preferences.currency)}{$numberWithCommas($dontShowNaN(curr_price))}</span>
                  </p>
                </div>
              );
            }

          }.bind(this))}
        </div>
          <span>
            <i onClick={this._closeCoinInfo} className={coinCloseClass} aria-hidden="true"></i>
            <Coin visible={this.state.coin_visibility} parentState={this.state} coin={this.state.coin_info} />
          </span>
        {localStorage.seenAddApp !== "true" &&
          <div className="save-app">Add to Home Screen for app experience <i onClick={this._hideAddApp}
                                                                             className="fa fa-times text-right"
                                                                             aria-hidden="true"></i></div>
        }
        </span>
      </div>
    );
  }
}

export default App;
