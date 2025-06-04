let world;
let startNode;
let endNode;
let fullPathlist;
let worldDim = 60;

// three.js globals
let scene, camera, renderer, controls;
let cubes = [];
let cubeGroup;

let pickStartNode, pickEndNode, startPathFinding, dropObstacles;


class Node{
    constructor(nodeName, nextNode, previousNode){
        this.nodeName = nodeName;
        this.nextNode = nextNode;
        this.previousNode = previousNode;
        this.gCost;
        this.hCost;
        this.fCost;
        this.row = null;
        this.col = null;
        this.isObstacle = false;
    }
}

//LinkedList
class List{
    constructor(head){
        this.head = head;
        this.tail = head;
        this.length = 1;
    }
    
    //Node is added to the end of the list
    addNode(n){
        n.previousNode = this.tail;
        this.tail.nextNode = n;
        this.tail = n;
        this.length++;
    }

    //Prints out the nodechain, and colors the node chain
    traverseNodeChain() {
        let currentNode = this.head;
        while(currentNode.nodeName){
            console.log(`Current Node value: ${currentNode.nodeName}`);
            let td = document.getElementsByTagName('td');
            td[worldDim * currentNode.row + currentNode.col].setAttribute('class', 'path');

            if(currentNode.previousNode){
                currentNode = currentNode.previousNode;
            }else{
                break;
            }
        }
    }

    //Returns a reverse version of the node chain
    static reverse(l){
        let tempList = new List(new Node(l.tail.nodeName));
        let tempNode = l.tail;
        
        while(tempNode.previousNode){
            tempList.addNode(new Node(tempNode.previousNode.nodeName));
            tempNode = tempNode.previousNode;
        }
        return tempList
    }

}

function initThree(width, height){
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / 500, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, 500);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0x090d23);
    document.getElementById('three-container').appendChild(renderer.domElement);
    camera.position.set(width / 2, height, height * 1.5);
    camera.lookAt(width / 2, 0, height / 2);

    cubeGroup = new THREE.Group();
    scene.add(cubeGroup);

    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambient);
    const dir = new THREE.DirectionalLight(0xffffff, 0.5);
    dir.position.set(0, 10, 10);
    scene.add(dir);

    const geometry = new THREE.BoxGeometry(0.9, 0.9, 0.9);
    for(let i=0;i<height;i++){
        cubes[i] = [];
        for(let j=0;j<width;j++){
            const material = new THREE.MeshStandardMaterial({color: 0xffffff});
            const cube = new THREE.Mesh(geometry, material);
            cube.position.set(j, 0, i);
            cubeGroup.add(cube);
            cubes[i][j] = cube;
        }
    }

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    animate();
}

function animate(){
    requestAnimationFrame(animate);
    cubeGroup.rotation.y += 0.005;
    if(controls) controls.update();
    renderer.render(scene, camera);
}

function updateCubeColor(row, col, color){
    if(cubes[row] && cubes[row][col]){
        cubes[row][col].material.color.set(color);
    }
}

function animatePath(node){
    const steps = [];
    let current = node;
    while(current){
        steps.unshift(current);
        current = current.previousNode;
    }
    steps.forEach((n, i) => {
        setTimeout(() => {
            updateCubeColor(n.row, n.col, 0xff35a6);
        }, i * 100);
    });
}

//Create a visualiztion of the grid 
function createGrid(width, height){
    function initWorldArray(rows,cols){
        let grid = new Array(rows);
        for(let i = 0; i < rows; i++){
            grid[i] = new Array(cols);
            for(let j = 0; j < cols; j++){
                grid[i][j] = 0;
            }
        }
        return grid;
    }
    let grid = document.getElementById('grid');
    let grid_width = width;
    let grid_height = height;
    world = (initWorldArray(grid_height, grid_width));
    initThree(grid_width, grid_height);

    for(let i = 0; i < grid_height; i++){
        //Create a row
        let row = document.createElement('tr');
        //row.setAttribute('class',`row ${i}`);
        
        //Add columns into the table
        for(let j = 0; j < grid_width; j++){
            let col = document.createElement('td');
            col.setAttribute('class', `${i}`);
            col.setAttribute('id', `${j}`);
            row.appendChild(col);
            col.addEventListener('mousemove', setState);

            //Add the node to the world_grid array
            let temp = new Node(`${i}${j}`,null,null);
            temp.row = i;
            temp.col = j;
            world[i][j] = temp;
            
        }

        //insert the row into the table
        grid.appendChild(row);
    }

}

//Called whenever a cell on the table is clicked
//Purpose: Used to set the type of the cell - start, end
//default behaviour is to set obstacles
function setState(){
    //find the correct class name
    let cn = `${this.className[0]}`;
    if(this.className[1] !== ' ' && this.className[1]){
        cn += this.className[1];
    }

    console.log("Pressed Button in row:" + cn +" column:" + this.id + " isobstacle:"+world[cn][this.id].isObstacle);
    //Set the startNode
    if(pickStartNode){
        //if there already is a startnode, and we want to modify it
        if(startNode){
            let prev = document.getElementById('start_node');
            prev.setAttribute('id', `${startNode.col}`);
            updateCubeColor(startNode.row, startNode.col, 0xffffff);
            startNode = null;
        }
        //Creates a new start node
        let node = document.getElementsByClassName(this.className);
        startNode = world[cn][this.id];
        node[this.id].setAttribute('id', 'start_node');
        updateCubeColor(startNode.row, startNode.col, 0xedffa3);
        pickStartNode = false;
    }
    
    //Set the endNode
    else if(pickEndNode){
        //if there already is a startnode, and we want to modify it
        if(endNode){
            let prev = document.getElementById('end_node');
            prev.setAttribute('id', `${endNode.col}`);
            updateCubeColor(endNode.row, endNode.col, 0xffffff);
            endNode = null;
        }
        //Creates a new start node
        let node = document.getElementsByClassName(this.className);
        endNode = world[this.className][this.id];
        node[this.id].setAttribute('id', 'end_node');
        updateCubeColor(endNode.row, endNode.col, 0xffddbf);
        pickEndNode = false;

    }

    //Set obstacle
    else if(dropObstacles){
        if(this.id !== 'start_node' && this.id !== "end_node"){
            world[cn][this.id].isObstacle = true;
            this.setAttribute('class', `${cn} obstacle`);
            updateCubeColor(parseInt(cn), parseInt(this.id), 0x6495ed);
        }
    }
}

window.addEventListener('keydown', (e)=>{
    if(e.key === "Escape"){
        dropObstacles = !dropObstacles;
    }
    if(e.key === "s"){
        pickStartNode = !pickStartNode;
    }
    if(e.key === "e"){
        pickEndNode = !pickEndNode;
    }
    if(e.key === "Enter"){
         startPathFinding = true;
         findPath();
         updatePathUI();
    }

});

function updatePathUI(){
    let l = new List(endNode);
    l.traverseNodeChain();
    animatePath(endNode);
}

createGrid(worldDim,worldDim);

//finds the shortest path using A star
function findPath(){
    let timer = 0;
    let currentNode = startNode;
    let openList = new Array();
    let closelist = new Array();

    openList.push(currentNode);
    startNode.gCost = 0;
    startNode.hCost = (startNode.row - endNode.row) ** 2 + (startNode.col - endNode.col) ** 2;
    startNode.fCost = startNode.gCost + startNode.hCost;

    while(openList.length > 0 && timer < 200){
        timer++;
        //Sort the open list
        openList.sort((a,b)=>{
            if((a.fCost - b.fCost) > 0){
                return 1;
            }
            else if((a.fCost - b.fCost) < 0){
                return -1
            }
            else{
                return 0;
            }

        });
                
        //DEBUG
        console.log("Sorted openlist");
        for(let i = 0; i < openList.length; i++){
            console.log(openList[i]);
        }
        currentNode = openList.shift();
        closelist.push(currentNode);
        console.log(`Current node is ${currentNode.nodeName}`);

        //Found the end node(goal)
        if(currentNode.hCost === 0){
            console.log("Found the last node");
            fullPathlist = currentNode;
            return;
        }

        //Check the adjacent nodes of the current node
        for(let row = currentNode.row - 1; row <= currentNode.row + 1; row++){
            for(let col = currentNode.col - 1; col <= currentNode.col + 1; col++){
                //Valid world index
                if(isValidPathStep(row,col)){
                    if(!(world[row][col] === currentNode)){
                        let childNode = world[row][col];

                        //if the childnode is in the closed list then move on to the other childnodes
                        if(closelist.includes(childNode)){
                            continue;
                        }

                        childNode.gCost = currentNode.gCost + 10;
                        childNode.hCost = (childNode.row - endNode.row)** 2 + (childNode.col - endNode.col) ** 2;
                        childNode.fCost = childNode.gCost + childNode.hCost;
                        childNode.previousNode = currentNode;

                        //childnode is already in the openList
                        if(openList.includes(childNode)){
                            let i = openList.indexOf(childNode);
                            if(openList[i].gCost <= childNode.gCost){
                                console.log("Did not update the node");
                                continue;
                            }  
                        }
                        //Seeing the childnode for the first time
                        openList.push(childNode);
                        console.log(`Added node ${childNode.nodeName} to the openlist`);
                        console.log(`Node ${childNode.nodeName} gCost:${childNode.gCost} hCost:${childNode.hCost} has parent:${childNode.previousNode.nodeName}`);

                    }
                }
            }
        }

    } 
    if(openList.length <= 0){
        console.log("Did not find a path");
    }

}

//Checks if the adacent nodes are valid or not
function isValidPathStep(rowIndex, colIndex){
    let validRow = (0 <= rowIndex && rowIndex <= world.length -1);
    let validCol = (0 <= colIndex && colIndex <= world.length -1);
        if (validRow && validCol)
        {
            if (!(world[rowIndex][colIndex].isObstacle))
            {
                return true;
            }
        }
        return false;
}


