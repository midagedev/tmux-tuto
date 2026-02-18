FROM docker.io/i386/alpine:3.21.0

ENV KERNEL=virt
ENV ADDPKGS="nodejs tmux"

COPY profile.d/tmux-tuto-banner.sh /etc/profile.d/tmux-tuto-banner.sh

RUN apk add --no-cache openrc alpine-base agetty alpine-conf linux-$KERNEL linux-firmware-none $ADDPKGS

RUN sed -i 's/getty 38400 tty1/agetty --autologin root tty1 linux/' /etc/inittab
RUN echo 'ttyS0::respawn:/sbin/agetty --autologin root -s ttyS0 115200 vt100' >> /etc/inittab
RUN echo "root:" | chpasswd
RUN chmod +x /etc/profile.d/tmux-tuto-banner.sh

RUN setup-hostname localhost

# Networking helper for environments where virtio/ne2k is hot-swapped
RUN echo -e "rmmod ne2k-pci && modprobe ne2k-pci\nrmmod virtio-net && modprobe virtio-net\nhwclock -s\nsetup-interfaces -a -r" > /root/networking.sh \
  && chmod +x /root/networking.sh

RUN for i in devfs dmesg mdev hwdrivers; do rc-update add "$i" sysinit; done
RUN for i in hwclock modules sysctl hostname syslog bootmisc; do rc-update add "$i" boot; done
RUN rc-update add killprocs shutdown

# Include 9p modules so v86 can boot kernel/initramfs directly from host9p
RUN mkinitfs -F "base virtio 9p" "$(cat /usr/share/kernel/$KERNEL/kernel.release)"
