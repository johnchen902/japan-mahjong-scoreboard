// see http://mahjong-europe.org/docs/riichi_EN.pdf
// for naming
(function() {
    "use strict";
    function /** boolean */ simpleArraysEqual(/** !Array<number> */ a, /** !Array<number> */ b) {
        /*
        if (a === b)
            return true;
        if (a == null || b == null)
            return false;
        if (a.length != b.length)
            return false;
        */
        for (var i = 0; i < a.length; ++i)
            if (a[i] !== b[i])
                return false;
        return true;
    }
    /** @constructor @struct @final */
    function State (/** number */ initial) {
        /** number */ this.round = 0;    // 東
        /** number */ this.rotation = 0; // 1 局
        /** number */ this.counter = 0;  // 0 本場
        /** number */ this.deposit = 0;  // 託供
        /** !Array<number> */ this.points = [initial, initial, initial, initial];
        /** !Array<boolean> */ this.riichied = [false, false, false, false];
    }
    State.prototype.copyFrom = function /** !State */ (/** !State */ state) {
        this.round = state.round;
        this.rotation = state.rotation;
        this.counter = state.counter;
        this.deposit = state.deposit;
        this.points = state.points.slice();
        this.riichied = state.riichied.slice();
        return this;
    };
    State.prototype.copy = function /** !State */ () {
        return new State(0).copyFrom(this); 
    };
    State.prototype.equals = function /** boolean */ (/** !State */ state) {
        return this === state ||
              (this.round == state.round &&
               this.rotation == state.rotation &&
               this.counter == state.counter &&
               this.deposit == state.deposit &&
               simpleArraysEqual(this.points, state.points) &&
               simpleArraysEqual(this.riichied, state.riichied));
    };
    State.prototype.canRiichi = function /** boolean */ (/** number */ who) {
        return !this.riichied[who];
    };
    State.prototype.riichi = function (/** number */ who) {
        if(this.canRiichi(who)) {
            this.riichied[who] = true;
            this.points[who] -= 1000;
            this.deposit++;
        }
    };
    State.prototype.abortiveDraw = function () {
        this.counter++;
        this.riichied.fill(false);
    };
    State.prototype.exhaustiveDraw = function (/** !Array<boolean> */ tenpai, /** !Array<boolean> */ nagashimangan) {
        if(nagashimangan.some(x => x)) {
            nagashimangan.forEach((x, i) =>
                                  x && this.tsumoPointsOnly(i, 4000, 2000));
        } else {
            var /** number */ tenpaiCount = 0;
            tenpai.forEach(x => x && tenpaiCount++);
            if(tenpaiCount > 0 && tenpaiCount < 4) {
                var /** number */ tenpaiPt = 3000 / tenpaiCount;
                var /** number */ notenPt = 3000 / (4 - tenpaiCount);
                tenpai.forEach((x, i) => x ? this.points[i] += tenpaiPt
                    : this.points[i] -= notenPt);
            }
        }
        this.counter++;
        this.riichied.fill(false);
        if(!tenpai[this.rotation])
            this.rotate();
    };
    State.prototype.ron = function(/** number */ loser, /** !Array<number> */ winner, /** !Array<number> */ point) {
        var /** number */ firstWinner = winner[0];
        for(var /** number */ i = 0; i < winner.length; i++)
        if((winner[i] - loser + 4) % 4 < (firstWinner - loser + 4) % 4)
            firstWinner = winner[i];
        for(var i = 0; i < winner.length; i++) {
            var /** number */ pt = (point[i] | 0);
            if(winner[i] == firstWinner)
                pt += this.counter * 300;
            this.ronPointsOnly(loser, winner[i], pt);
        }

        this.points[firstWinner] += this.deposit * 1000;
        this.deposit = 0;
        if(winner.indexOf(this.rotation) != -1) {
            this.counter++;
        } else {
            this.counter = 0;
            this.rotate();
        }
        this.riichied.fill(false);
    };
    State.prototype.ronPointsOnly = function (/** number */ loser, /** number */ winner, /** number */ point) {
        this.points[loser] -= point;
        this.points[winner] += point;
    };
    State.prototype.tsumo = function (/** number */ who, /** number */ eastPoint, /** number */ otherPoint) {
        eastPoint += this.counter * 100;
        otherPoint += this.counter * 100;
        this.tsumoPointsOnly(who, eastPoint, otherPoint);
        this.points[who] += this.deposit * 1000;
        this.deposit = 0;
        if(who == this.rotation) {
            this.counter++;
        } else {
            this.counter = 0;
            this.rotate();
        }
        this.riichied.fill(false);
    };
    State.prototype.tsumoPointsOnly = function (/** number */ who, /** number */ east, /** number */ other) {
        if(who == this.rotation) {
            this.points[who] += east * 3;
            for(var /** number */ i = 0; i < 4; i++)
            if(i != who)
                this.points[i] -= east;
        } else {
            this.points[who] += east + other * 2;
            for(var i = 0; i < 4; i++)
            if(i != who) {
                if(i == this.rotation)
                    this.points[i] -= east;
                else
                    this.points[i] -= other;
            }
        }
    };
    State.prototype.chombo = function (/** number */ who) {
        this.tsumoPointsOnly(who, -4000, -2000);
    };
    State.prototype.rotate = function () {
        if(++this.rotation == 4) {
            this.rotation = 0;
            if(++this.round == 4)
                this.round = 0;
        }
    };
    /** @constructor @struct @final */
    function PlayerUI(parent) {
        /** !Object */ this.wind = parent.getElementsByClassName("wind")[0];
        /** !Object */ this.points = parent.getElementsByClassName("points")[0];
        /** !Object */ this.riichi = parent.getElementsByClassName("riichi")[0];
        /** !Object */ this.tsumo = parent.getElementsByClassName("tsumo")[0];
        /** !Object */ this.ron = parent.getElementsByClassName("ron")[0];
        /** !Object */ this.hoju = parent.getElementsByClassName("hoju")[0];
        /** !Object */ this.fanMinipoint = parent.getElementsByClassName("fan-minipoint")[0];
        /** !Object */ this.tenpai = parent.getElementsByClassName("tenpai")[0];
        /** !Object */ this.noten = parent.getElementsByClassName("noten")[0];
        /** !Object */ this.nagashimangan = parent.getElementsByClassName("nagashimangan")[0];
    }
    PlayerUI.prototype.disableAll = function () {
        this.riichi.disabled = true;
        this.tsumo.disabled = true;
        this.ron.disabled = true;
        this.hoju.disabled = true;
        this.fanMinipoint.disabled = true;
        this.tenpai.disabled = true;
        this.noten.disabled = true;
        this.nagashimangan.disabled = true;
    };
    /** @constructor @struct @final */
    function UI() {
        /** !Object */ this.round = document.getElementById("round");
        /** !Object */ this.rotation = document.getElementById("rotation");
        /** !Object */ this.counter = document.getElementById("counter");
        /** !Object */ this.deposit = document.getElementById("deposit");
        /** Array<!PlayerUI> */ this.players = [];
        this.players[0] = new PlayerUI(document.getElementById("player-1"));
        this.players[1] = new PlayerUI(document.getElementById("player-2"));
        this.players[2] = new PlayerUI(document.getElementById("player-3"));
        this.players[3] = new PlayerUI(document.getElementById("player-4"));
        /** !Object */ this.abortiveDraw = document.getElementById("abortive-draw");
        /** !Object */ this.exhaustiveDraw = document.getElementById("exhaustive-draw");
        /** !Object */ this.undo = document.getElementById("undo");
        /** !Object */ this.redo = document.getElementById("redo");
        /** !Object */ this.newGame = document.getElementById("new-game");
        /** !Object */ this.edit = document.getElementById("edit");
        /** !Object */ this.history = document.getElementById("history");
    }
    UI.prototype.disableAll = function () {
        for(var /** number */ i = 0; i < 4; i++)
        this.players[i].disableAll();
        this.abortiveDraw.disabled = true;
        this.exhaustiveDraw.disabled = true;
        this.undo.disabled = true;
        this.redo.disabled = true;
        this.newGame.disabled = true;
        this.edit.disabled = true;
    };
    var /** !UI */ ui;
    function showState(/** !State */ state) {
        /** @const {string} */ var winds = "東南西北";
        ui.round.textContent = winds[state.round];
        ui.rotation.textContent = state.rotation + 1;
        ui.counter.textContent = state.counter;
        ui.deposit.textContent = state.deposit;
        for(var /** number */ i = 0; i < 4; i++) {
            var /** !PlayerUI */ p = ui.players[i];
            p.wind.textContent = winds[(i - state.rotation + 4) % 4];
            p.points.textContent = state.points[i];
        }
    }
    var history = function() {
        /** @const {!State} */ var currentState = new State(25000);
        /** @const {!Array<!State>} */ var historyState = [new State(25000)];
        var /** string */ currentText = "?";
        /** @const {!Array<string>} */ var historyText = ["NEW GAME"];
        var /** number */ historyPointer = 0;
        function prefixText() {
            return ("東南西北"[currentState.round]) + " " + 
                (currentState.rotation + 1) + " 局 " + currentState.counter + " 本場 ";
        }
        function playerText(/** number */ who) {
            return "P" + (who + 1);
        }
        function pushHistory() {
            showState(currentState);
            historyState.splice(historyPointer + 1);
            historyState.push(currentState.copy());
            historyText.splice(historyPointer + 1);
            historyText.push(currentText);
            currentText = "?";
            historyPointer++;
            ui.history.textContent = historyText.join("\n");
        }
        function /** !State */ current() {
            return currentState;
        }
        function riichi(/** number */ who) {
            currentText = prefixText() + playerText(who) + " リーチ"; 
            currentState.riichi(who);
            pushHistory();
        }
        function tsumo(/** number */ who, /** number */ east, /** number */ rest) {
            currentText = prefixText() + playerText(who) + " ツモ " + east + 
                       (who == currentState.rotation ? "∀" : "-" + rest);
            currentState.tsumo(who, east, rest);
            pushHistory() ;
        }
        function ron(/** number */ loser, /** !Array<number> */ winners, /** !Array<number> */ points) {
            currentText = prefixText();
            for(var /** number */ i = 0; i < winners.length; i++)
                currentText += playerText(winners[i]) + " ロン " + points[i] + " ";
            currentText += playerText(loser) + " 放銃";
            currentState.ron(loser, winners, points);
            pushHistory();
        }
        function abortiveDraw() {
            currentText = prefixText() + "途中流局";
            currentState.abortiveDraw();
            pushHistory();
        }
        function exhaustiveDraw(/** !Array<boolean> */ tenpai, /** !Array<boolean> */ nagashimangan) {
            currentText = prefixText() + "荒牌平局";
            if(nagashimangan.some(x => x)) {
                for(var /** number */ i = 0; i < 4; i++)
                    if(nagashimangan[i])
                        currentText += " " + playerText(i);
                currentText += " 流し満貫 " + playerText(currentState.rotation) + " " + 
                    (tenpai[currentState.rotation] ? "聴牌" : "不聴");
            } else {
                var tenpaiCount = 0;
                for(var i = 0; i < 4; i++)
                    if(tenpai[i])
                        tenpaiCount++;
                switch(tenpaiCount) {
                case 0:
                    currentText += " 全員不聴";
                    break;
                case 4:
                    currentText += " 全員聴牌";
                    break;
                default:
                    for(var i = 0; i < 4; i++)
                        if(tenpai[i])
                            currentText += " " + playerText(i);
                    currentText += " 聴牌";
                    break;
                }
            }
            currentState.exhaustiveDraw(tenpai, nagashimangan);
            pushHistory();
        }
        function /** boolean */ isNewGame() {
            return currentState.equals(historyState[0]);
        }
        function newGame() {
            currentText = "NEW GAME";
            currentState.copyFrom(historyState[0]);
            pushHistory();
        }
        function /** boolean */ canUndo() {
            return historyPointer > 0;
        }
        function undo() {
            currentState.copyFrom(historyState[--historyPointer]);
            showState(currentState);
            ui.history.textContent = historyText.slice(0, historyPointer + 1).join("\n");
        }
        function /** boolean */ canRedo() {
            return historyPointer < historyState.length - 1;
        }
        function redo() {
            currentState.copyFrom(historyState[++historyPointer]);
            showState(currentState);
            ui.history.textContent = historyText.slice(0, historyPointer + 1).join("\n");
        }

        return {
            /** function():!State */ current: current,
            /** function(number) */ riichi: riichi,
            /** function(number,number,number) */ tsumo: tsumo,
            /** function(number,!Array<number>,!Array<number>) */ ron: ron,
            /** function() */ abortiveDraw: abortiveDraw,
            /** function(!Array<boolean>,!Array<boolean>) */ exhaustiveDraw: exhaustiveDraw,
            /** function():boolean */ isNewGame: isNewGame,
            /** function() */ newGame: newGame,
            /** function():boolean */ canUndo: canUndo,
            /** function() */ undo: undo,
            /** function():boolean */ canRedo: canRedo,
            /** function() */ redo: redo,
        };
    }();
    var buttonListeners = function () {
        /** @const {!Array<!Object>} */ var activeBtnList = [];
        function add(button, /** function() */ listener) {
            button.onclick = listener;
            button.disabled = false;
            activeBtnList.push(button);
        }
        function remove(button) {
            var /** number */ index = activeBtnList.indexOf(button);
            if(index > -1)
                activeBtnList.splice(index, 1);
            button.disabled = true;
            button.onclick = () => false;
        }
        function removeAll() {
            activeBtnList.forEach(button => {
                button.disabled = true;
                button.onclick = () => false;
            });
            activeBtnList.slice();
        }

        return {
            add: add,
            remove: remove,
            removeAll: removeAll,
        };
    }();
    function setBodyClass(/** string */ clazz) {
        document.body.className = clazz;
    }
    function enterNormalUIState() {
        setBodyClass("normal-state");

        ui.players.forEach((p, who) => {
            if(history.current().canRiichi(who)) {
                buttonListeners.add(p.riichi, function() {
                    history.riichi(who);
                    leaveNormalUIState();
                    enterNormalUIState();
                });
            }
            buttonListeners.add(p.tsumo, function() {
                leaveNormalUIState();
                enterTsumoUIState(who);
            });
            buttonListeners.add(p.ron, function() {
                leaveNormalUIState();
                enterRonUIState(who);
            });
        });
        buttonListeners.add(ui.abortiveDraw, function() {
            history.abortiveDraw();
            leaveNormalUIState();
            enterNormalUIState();
        });
        buttonListeners.add(ui.exhaustiveDraw, function() {
            leaveNormalUIState();
            enterExhaustiveDrawUIState();
        });
        if(!history.isNewGame()) {
            buttonListeners.add(ui.newGame, function() {
                history.newGame();
                leaveNormalUIState();
                enterNormalUIState();
            });
        }
        if(history.canUndo()) {
            buttonListeners.add(ui.undo, function() {
                history.undo();
                leaveNormalUIState();
                enterNormalUIState();
            });
        }
        if(history.canRedo()) {
            buttonListeners.add(ui.redo, function() {
                history.redo();
                leaveNormalUIState();
                enterNormalUIState();
            });
        }
        // TODO edit
    }
    function leaveNormalUIState() {
        buttonListeners.removeAll();
    }
    function enterTsumoUIState(/** number */ who) {
        setBodyClass("tsumo-state");

        var /** !Object */ fm = ui.players[who].fanMinipoint;
        fm.disabled = false;
        fm.value = "0";
        fm.onchange = function() {
            var /** number */ val = fm.value | 0;
            if(val) {
                var /** function(number):number */ c100 = x => Math.ceil(x / 100) * 100;
                history.tsumo(who, c100(val * 2), c100(val));
                leaveTsumoUIState(who);
                enterNormalUIState();
            }
        };
        buttonListeners.add(ui.undo, function() {
            leaveTsumoUIState(who);
            enterNormalUIState();
        });
    }
    function leaveTsumoUIState(/** number */ who) {
        buttonListeners.removeAll();
        var fm = ui.players[who].fanMinipoint;
        fm.disabled = true;
        fm.value = "0";
        fm.onchange = () => false;
    }
    function enterRonUIState(/** number */ firstWinner) {
        setBodyClass("ron-state");

        var /** !Array<number> */ winners = [firstWinner];
        var /** !Array<number> */ points = [0];
        var /** number */ loser = -1;
        function check() {
            if(points.every(x => x) && loser > -1) {
                history.ron(loser, winners, points);
                leaveRonUIState();
                enterNormalUIState();
            }
        }
        ui.players.forEach((p, who) => {
            if(who == winners[0]) {
                p.fanMinipoint.disabled = false;
                p.fanMinipoint.value = "0";
                p.fanMinipoint.onchange = function () {
                    var /** number */ val = p.fanMinipoint.value | 0;
                    if(val) {
                        var /** function(number): number */ c100 = x => Math.ceil(x / 100) * 100;
                        var east = history.current().rotation;
                        points[0] = c100(val * (who == east ? 6 : 4));
                        p.fanMinipoint.disabled = true;
                        p.fanMinipoint.onchange = () => false;
                        check();
                    }
                };
            } else {
                buttonListeners.add(p.ron, function() {
                    /** @const number */
                    var id = winners.length;
                    winners.push(who);
                    points.push(0);
                    buttonListeners.remove(p.ron);
                    buttonListeners.remove(p.hoju);
                    p.fanMinipoint.disabled = false;
                    p.fanMinipoint.value = "0";
                    p.fanMinipoint.onchange = function () {
                        var /** number */ val = p.fanMinipoint.value | 0;
                        if(val) {
                            var /** function(number): number */ c100 = x => Math.ceil(x / 100) * 100;
                            var east = history.current().rotation;
                            points[id] = c100(val * (who == east ? 6 : 4));
                            p.fanMinipoint.disabled = true;
                            p.fanMinipoint.onchange = () => false;
                            check();
                        }
                    };
                    if(winners.length == 3) {
                        loser = (0 + 1 + 2 + 3) - winners[0] - winners[1] - winners[2];
                        buttonListeners.remove(ui.players[loser].ron);
                        buttonListeners.remove(ui.players[loser].hoju);
                    }
                });
                buttonListeners.add(p.hoju, function() {
                    loser = who;
                    buttonListeners.remove(p.ron);
                    ui.players.forEach(p => buttonListeners.remove(p.hoju));
                    check();
                });
            }
        });
        buttonListeners.add(ui.undo, function() {
            leaveRonUIState();
            enterNormalUIState();
        });
    }
    function leaveRonUIState() {
        buttonListeners.removeAll();
        ui.players.forEach(p => {
            p.fanMinipoint.disabled = true;
            p.fanMinipoint.value = "0";
            p.fanMinipoint.onchange = () => false;
        });
    }

    function enterExhaustiveDrawUIState() {
        setBodyClass("exhaustive-draw-state");

        var /** number */ selected = 0;
        var /** !Array<boolean> */ tenpai = [false, false, false, false];
        ui.players.forEach((p, who) => {
            function select(/** boolean */ val) {
                selected++;
                tenpai[who] = val;
                buttonListeners.remove(p.tenpai);
                buttonListeners.remove(p.noten);
                if(selected == 4) {
                    var /** !Array<boolean> */ nagashi = ui.players.map(x => x.nagashimangan.checked);
                    history.exhaustiveDraw(tenpai, nagashi);
                    leaveExhaustiveDrawUIState();
                    enterNormalUIState();
                }
            }
            buttonListeners.add(p.tenpai, () => select(true));
            buttonListeners.add(p.noten, () => select(false));
            p.nagashimangan.disabled = false;
            p.nagashimangan.checked = false;
            if(history.current().riichied[who])
                select(true);
        });
        buttonListeners.add(ui.undo, function() {
            leaveExhaustiveDrawUIState();
            enterNormalUIState();
        });
    }
    function leaveExhaustiveDrawUIState() {
        buttonListeners.removeAll();
        ui.players.forEach(p => p.nagashimangan.disabled = true);
    }
    function initialize() {
        ui = new UI();
        ui.disableAll();
        showState(history.current());
        enterNormalUIState();
    }
    if(document.readyState === "loading") {
        document.onreadystatechange = function() {
            if(document.readyState === "interactive") {
                initialize();
                document.onreadystatechange = () => false;
            }
        };
    } else {
        initialize();
    }
})();

