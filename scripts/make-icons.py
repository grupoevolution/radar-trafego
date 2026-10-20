# gera icon-192.png e icon-512.png (sem dependências): quadrado dourado com radar
import zlib, struct, math, sys
def png(size, path):
    gold=(233,196,106); ink=(26,20,5); bg=(10,13,19)
    rad=size*15/64; c=size/2
    rows=[]
    for y in range(size):
        row=bytearray([0])
        for x in range(size):
            px,py=x+.5,y+.5
            # cantos arredondados
            dx=max(rad-px,0,px-(size-rad)); dy=max(rad-py,0,py-(size-rad))
            inside = (dx*dx+dy*dy) <= rad*rad
            col=gold if inside else bg
            if inside:
                d=math.hypot(px-c,py-c); w=size*4/64
                r1=size*18/64; r2=size*8/64
                ring = abs(d-r1)<w/2 or abs(d-r2)<w/2
                # ponteiro 45° pra cima-direita
                vx,vy=px-c,py-c; L=size*13/64*math.sqrt(2)
                t=(vx*0.7071 - vy*0.7071); perp=abs(vx*0.7071 + vy*0.7071)
                needle = 0<=t<=L and perp<w/2
                if ring or needle: col=ink
            row+=bytes(col)
        rows.append(bytes(row))
    raw=b''.join(rows)
    def chunk(t,d): return struct.pack('>I',len(d))+t+d+struct.pack('>I',zlib.crc32(t+d)&0xffffffff)
    data=b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',size,size,8,2,0,0,0))+chunk(b'IDAT',zlib.compress(raw,9))+chunk(b'IEND',b'')
    open(path,'wb').write(data)
for s in (192,512): png(s, f'public/icon-{s}.png')
print('ok')
