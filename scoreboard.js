(function() {
    "use strict";
    function replace(arr, index, value) {
        arr = arr.slice();
        arr[index] = value;
        return arr;
    }
    class State {
        constructor(ba, kyoku, honba, kyoutaku, points, reached) {
            // {"東南西北"[ba]}{"一二三四"[kyoku]}局
            // {honba} 本場
            // 供託 &times; {kyoutaku}
            this.ba = ba;
            this.kyoku = kyoku;
            this.honba = honba;
            this.kyoutaku = kyoutaku;
            this.points = Object.freeze(points.slice());
            this.reached = Object.freeze(reached.slice());
            Object.freeze(this);
        }
        static newGameState(initial) {
            return new State(0, 0, 0, 0,
                [initial, initial, initial, initial],
                [false, false, false, false]);
        }
        static rotatedState(ba, kyoku, honba, kyoutaku, points, reached) {
            if (++kyoku == 4) {
                kyoku = 0;
                if (++ba == 4)
                    ba = 0;
            }
            return new State(ba, kyoku, honba, kyoutaku, points, reached);
        }
        reach(who) {
            if (this.reached[who])
                throw new Error(who + " has already reached");
            return new State(this.ba, this.kyoku, this.honba, this.kyoutaku + 1,
                replace(this.points, who, this.points[who] - 1000),
                replace(this.reached, who, true));
        }
        abortiveDraw() {
            return new State(this.ba, this.kyoku, this.honba + 1, this.kyoutaku,
                this.points, [false, false, false, false]);
        }
        exhaustiveDraw(tenpai, nagashimangan) {
            var points = this.points.slice();
            if (nagashimangan.some(x => x)) {
                nagashimangan.forEach((x, i) =>
                        x && this.calculateTsumoPoints(points, i, 4000, 2000));
            } else {
                var tenpaiCount = 0;
                tenpai.forEach(x => x && tenpaiCount++);
                if (tenpaiCount > 0 && tenpaiCount < 4) {
                    var tenpaiPt = 3000 / tenpaiCount;
                    var notenPt = 3000 / (4 - tenpaiCount);
                    tenpai.forEach((x, i) => x ? points[i] += tenpaiPt
                        : points[i] -= notenPt);
                }
            }
            if (tenpai[this.kyoku]) {
                return new State(this.ba, this.kyoku, this.honba + 1,
                    this.kyoutaku, points, [false, false, false, false]);
            } else {
                return State.rotatedState(this.ba, this.kyoku, this.honba + 1,
                    this.kyoutaku, points, [false, false, false, false]);
            }
        }
        ron(loser, winners, ronPointsArr) {
            winners = winners.slice();
            winners.sort((a, b) => (a - loser + 4) % 4 - (b - loser + 4) % 4);
            var ronPointsMap = [];
            winners.forEach((w, i) => ronPointsMap[w] = ronPointsArr[i]);

            var points = this.points.slice();
            for (var i = 0; i < winners.length; i++) {
                var who = winners[i], pt = ronPointsMap[who];
                if (i == 0)
                    pt += this.honba * 300;
                points[who] += pt;
                points[loser] -= pt;
                if (i == 0)
                    points[who] += this.kyoutaku * 1000;
            }

            if (winners.indexOf(this.kyoku) != -1) {
                return new State(this.ba, this.kyoku, this.honba + 1, 0,
                    points, [false, false, false, false]);
            } else {
                return State.rotatedState(this.ba, this.kyoku, 0, 0,
                    points, [false, false, false, false]);
            }
        }
        tsumo(who, doublePoint, usualPoint) {
            doublePoint += this.honba * 100;
            usualPoint += this.honba * 100;

            var points = this.points.slice();
            this.calculateTsumoPoints(points, who, doublePoint, usualPoint);
            points[who] += this.kyoutaku * 1000;

            if (who == this.kyoku) {
                return new State(this.ba, this.kyoku, this.honba + 1, 0,
                    points, [false, false, false, false]);
            } else {
                return State.rotatedState(this.ba, this.kyoku, 0, 0,
                    points, [false, false, false, false]);
            }
        }
        calculateTsumoPoints(points, who, doublePoint, usualPoint) {
            for (var i = 0; i < 4; i++) {
                if (i == who)
                    continue;
                var payDouble = i == this.kyoku || who == this.kyoku;
                var point = payDouble ? doublePoint : usualPoint;
                points[who] += point;
                points[i] -= point;
            }
        }
    }
    function PlayerUI(parent) {
        this.wind = parent.getElementsByClassName("wind")[0];
        this.points = parent.getElementsByClassName("points")[0];
        this.riichi = parent.getElementsByClassName("riichi")[0];
        this.tsumo = parent.getElementsByClassName("tsumo")[0];
        this.ron = parent.getElementsByClassName("ron")[0];
        this.hoju = parent.getElementsByClassName("hoju")[0];
        this.fanMinipoint = parent.getElementsByClassName("fan-minipoint")[0];
        this.tenpai = parent.getElementsByClassName("tenpai")[0];
        this.noten = parent.getElementsByClassName("noten")[0];
        this.nagashimangan = parent.getElementsByClassName("nagashimangan")[0];
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

    function UI() {
        this.ba = document.getElementById("round");
        this.kyoku = document.getElementById("rotation");
        this.honba = document.getElementById("counter");
        this.kyoutaku = document.getElementById("deposit");
        this.players = [];
        this.players[0] = new PlayerUI(document.getElementById("player-1"));
        this.players[1] = new PlayerUI(document.getElementById("player-2"));
        this.players[2] = new PlayerUI(document.getElementById("player-3"));
        this.players[3] = new PlayerUI(document.getElementById("player-4"));
        this.abortiveDraw = document.getElementById("abortive-draw");
        this.exhaustiveDraw = document.getElementById("exhaustive-draw");
        this.undo = document.getElementById("undo");
        this.redo = document.getElementById("redo");
        this.newGame = document.getElementById("new-game");
        this.edit = document.getElementById("edit");
        this.history = document.getElementById("history");
    }
    UI.prototype.disableAll = function () {
        for(var i = 0; i < 4; i++)
            this.players[i].disableAll();
        this.abortiveDraw.disabled = true;
        this.exhaustiveDraw.disabled = true;
        this.undo.disabled = true;
        this.redo.disabled = true;
        this.newGame.disabled = true;
        this.edit.disabled = true;
    };
    var ui;
    function showState(state) {
        var winds = "東南西北";
        ui.ba.textContent = winds[state.ba];
        ui.kyoku.textContent = state.kyoku + 1;
        ui.honba.textContent = state.honba;
        ui.kyoutaku.textContent = state.kyoutaku;
        for(var i = 0; i < 4; i++) {
            var p = ui.players[i];
            p.wind.textContent = winds[(i - state.kyoku + 4) % 4];
            p.points.textContent = state.points[i];
        }
    }
    var history = function() {
        var currentState = State.newGameState(25000);
        var historyState = [currentState];
        var currentText = "?";
        var historyText = ["NEW GAME"];
        var historyPointer = 0;
        function prefixText() {
            return ("東南西北"[currentState.ba]) + " " +
                (currentState.kyoku + 1) + " 局 " + currentState.honba + " 本場 ";
        }
        function playerText(who) {
            return "P" + (who + 1);
        }
        function pushHistory() {
            showState(currentState);
            historyState.splice(historyPointer + 1);
            historyState.push(currentState);
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
            currentState = currentState.reach(who);
            pushHistory();
        }
        function tsumo(/** number */ who, /** number */ east, /** number */ rest) {
            currentText = prefixText() + playerText(who) + " ツモ " + east +
                       (who == currentState.kyoku ? "∀" : "-" + rest);
            currentState = currentState.tsumo(who, east, rest);
            pushHistory();
        }
        function ron(/** number */ loser, /** !Array<number> */ winners, /** !Array<number> */ points) {
            currentText = prefixText();
            for(var /** number */ i = 0; i < winners.length; i++)
                currentText += playerText(winners[i]) + " ロン " + points[i] + " ";
            currentText += playerText(loser) + " 放銃";
            currentState = currentState.ron(loser, winners, points);
            pushHistory();
        }
        function abortiveDraw() {
            currentText = prefixText() + "途中流局";
            currentState = currentState.abortiveDraw();
            pushHistory();
        }
        function exhaustiveDraw(/** !Array<boolean> */ tenpai, /** !Array<boolean> */ nagashimangan) {
            currentText = prefixText() + "荒牌平局";
            if(nagashimangan.some(x => x)) {
                for(var /** number */ i = 0; i < 4; i++)
                    if(nagashimangan[i])
                        currentText += " " + playerText(i);
                currentText += " 流し満貫 " + playerText(currentState.kyoku) + " " +
                    (tenpai[currentState.kyoku] ? "聴牌" : "不聴");
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
            currentState = currentState.exhaustiveDraw(tenpai, nagashimangan);
            pushHistory();
        }
        function newGame() {
            currentText = "NEW GAME";
            currentState = historyState[0];
            pushHistory();
        }
        function /** boolean */ canUndo() {
            return historyPointer > 0;
        }
        function undo() {
            currentState = historyState[--historyPointer];
            showState(currentState);
            ui.history.textContent = historyText.slice(0, historyPointer + 1).join("\n");
        }
        function /** boolean */ canRedo() {
            return historyPointer < historyState.length - 1;
        }
        function redo() {
            currentState = historyState[++historyPointer];
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
            if (!history.current().reached[who]) {
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
        if (true) {
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
                        var east = history.current().kyoku;
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
                            var east = history.current().kyoku;
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
            if(history.current().reached[who])
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

