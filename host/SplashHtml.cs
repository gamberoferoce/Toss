namespace TossHost;

static class SplashHtml
{
    // ponytail: keep in sync with receiver background (orbs + ambient canvas)
    internal const string Value = """
<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;overflow:hidden;background:#050508}
#fx-canvas{position:fixed;inset:0;pointer-events:none}
.bg-orb{position:fixed;border-radius:50%;filter:blur(80px);opacity:.35;pointer-events:none;animation:orb-drift 12s ease-in-out infinite}
.bg-orb.a{width:280px;height:280px;background:#1e3a8a;top:20%;left:10%}
.bg-orb.b{width:220px;height:220px;background:#312e81;bottom:15%;right:8%;animation-delay:-4s;animation-duration:15s}
.bg-orb.c{width:160px;height:160px;background:#0c4a6e;top:55%;left:55%;animation-delay:-7s;animation-duration:18s}
@keyframes orb-drift{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(30px,-20px) scale(1.08)}66%{transform:translate(-20px,25px) scale(.95)}}
</style></head><body>
<canvas id="fx-canvas"></canvas>
<div class="bg-orb a"></div><div class="bg-orb b"></div><div class="bg-orb c"></div>
<script>
const c=document.getElementById("fx-canvas"),x=c.getContext("2d"),p=[];
function resize(){c.width=innerWidth;c.height=innerHeight;if(!p.length)for(let i=0;i<28;i++)p.push({x:Math.random()*c.width,y:Math.random()*c.height,r:Math.random()*1.6+.4,vx:(Math.random()-.5)*.25,vy:(Math.random()-.5)*.25,a:Math.random()*.35+.08})}
function tick(){x.clearRect(0,0,c.width,c.height);for(const o of p){o.x+=o.vx;o.y+=o.vy;if(o.x<0)o.x=c.width;if(o.x>c.width)o.x=0;if(o.y<0)o.y=c.height;if(o.y>c.height)o.y=0;x.beginPath();x.arc(o.x,o.y,o.r,0,Math.PI*2);x.fillStyle="rgba(96,165,250,"+o.a+")";x.fill()}requestAnimationFrame(tick)}
addEventListener("resize",resize);resize();tick();
</script></body></html>
""";
}
