FROM docker.io/i386/alpine:3.21.0

ENV KERNEL=virt
ENV ADDPKGS="nodejs tmux"

COPY profile.d/tmux-tuto-banner.sh /etc/profile.d/tmux-tuto-banner.sh
COPY init.d/tmux-tuto-serial-perms /etc/init.d/tmux-tuto-serial-perms
COPY usr-local-bin/tmux-tuto-banner /usr/bin/tmux-tuto-banner
COPY usr-local-bin/tmux-tuto-probe /usr/bin/tmux-tuto-probe

RUN apk add --no-cache openrc alpine-base agetty alpine-conf linux-$KERNEL linux-firmware-none $ADDPKGS

RUN adduser -D -s /bin/ash tuto
RUN addgroup tuto dialout
RUN sed -i 's#^ttyS\\[0-9\\]\\*.*#ttyS[0-9]*\\troot:tuto 0660#' /etc/mdev.conf
RUN sed -i 's/getty 38400 tty1/agetty --autologin tuto tty1 linux/' /etc/inittab
RUN echo 'ttyS0::respawn:/sbin/agetty --autologin tuto -s ttyS0 115200 vt100' >> /etc/inittab
RUN echo 'ttyS1::respawn:/sbin/agetty -L -s ttyS1 115200 vt100' >> /etc/inittab
RUN echo "root:" | chpasswd
RUN echo "tuto:" | chpasswd
RUN chmod +x /etc/profile.d/tmux-tuto-banner.sh
RUN chmod +x /etc/init.d/tmux-tuto-serial-perms
RUN chmod +x /usr/bin/tmux-tuto-banner
RUN chmod +x /usr/bin/tmux-tuto-probe

RUN printf 'tmux-tuto\n' > /etc/hostname

# Networking helper for environments where virtio/ne2k is hot-swapped
RUN echo -e "rmmod ne2k-pci && modprobe ne2k-pci\nrmmod virtio-net && modprobe virtio-net\nhwclock -s\nsetup-interfaces -a -r" > /root/networking.sh \
  && chmod +x /root/networking.sh

RUN for i in devfs dmesg mdev hwdrivers; do rc-update add "$i" sysinit; done
RUN for i in hwclock modules sysctl hostname syslog bootmisc tmux-tuto-serial-perms; do rc-update add "$i" boot; done
RUN rc-update add killprocs shutdown

# Include 9p modules so v86 can boot kernel/initramfs directly from host9p
RUN mkinitfs -F "base virtio 9p" "$(cat /usr/share/kernel/$KERNEL/kernel.release)"
